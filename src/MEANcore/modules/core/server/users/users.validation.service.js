import async from 'async';
import _ from 'lodash';
import {
  randomBytes
} from 'crypto';
import mongoose from 'mongoose';
const User = mongoose.model('User');

/**
 * Function to check if a username already exists
 */
export const userExists = (usernameOrEmail, cb) => {
  User.findOne({
    $or: [{
        username: usernameOrEmail
      },
      {
        email: usernameOrEmail
      }
    ]
  }).exec((err, user) => {
    if (err) {
      return cb(err, null);
    } else if (!user) {
      return cb(null, false);
    }

    cb(null, user);
  });
}

export const validateChanges = (req, userUpdates, callback) => {
  const config = req.app.locals.config;
  let currentUser = req.user;

  // remove password property if it wasn't updated
  if (!userUpdates.password.length) {
    delete userUpdates.password;
  }

  // For security measurement we remove the roles from the req.body object
  delete userUpdates.roles;

  if (currentUser) {
    async.series([
      (cb) => {
        if (currentUser.username != userUpdates.username) {
          User.validateUsername(config, userUpdates.username, (err) => {
            if (err) {
              return cb(true, {
                message: err
              })
            }
          });
          // check to ensure username isn't already taken
          userExists(userUpdates.username, (err, userExists) => {
            if (err) {
              return cb(err);
            } else if (userExists) {
              // User name already exists, provide other possibilities
              const possibleUsername = userUpdates.username || ((userUpdates.email) ? userUpdates.email.split('@')[0] : '');

              User.findUniqueUsername(possibleUsername, null, (err, availableUsername) => {
                cb(true, {
                  userExists: true,
                  availableUsername: availableUsername
                });
              });
            } else {
              cb(null);
            }
          });
        } else {
          cb(null);
        }
      },
      (cb) => {
        User.findById({
            _id: mongoose.Types.ObjectId(currentUser._id)
          })
          .exec((err, user) => {
            if (!err && user) {

              if (userUpdates.password) {
                if (user.authenticate(userUpdates.password)) {
                  return cb('You cannot use a previous password.');
                } else {
                  user.salt = Buffer.from(randomBytes(16).toString('base64'), 'base64');
                  user.password = user.hashPassword(userUpdates.password);

                  // If password expiration set in config, set date of this accounts pw expiration
                  if (config.owaspConfig && config.owaspConfig.passwordExpirationDays) {
                    let today = new Date();
                    userUpdates.passwordExpiryDate = today.setDate(today.getDate() + config.owaspConfig.passwordExpirationDays);
                  }
                  
                  // remove password after update to prevent issues with merge
                  delete userUpdates.password;
                }
              }

              // Merge existing user
              user = _.extend(user.toObject(), userUpdates);

              user.updated = Date.now();
              user.displayName = userUpdates.firstName + ' ' + userUpdates.lastName;

              // Map out roles, only need to store role id
              user.roles = _.map(user.roles, (role) => {
                return role && role._id ? role._id.toString() : null;
              })

              let set = _.omit(user, '_id');

              User.updateOne({
                _id: mongoose.Types.ObjectId(user._id)
              }, {
                $set: set
              }, (err) => {
                if (err) {
                  return cb(config.helpers.getErrorMessage(err));
                } else {
                  // Remove sensitive data before login
                  user.password = undefined;
                  user.salt = undefined;

                  req.login(user, () => {
                    // Manually save session before redirect. See bug https://github.com/expressjs/session/pull/69
                    req.session.save((err) => {
                      if (err) {
                        return cb(err);
                      }

                      return cb(null);
                    })
                  });
                }
              });
            } else {
              return cb('User is not found');
            }
          })
      }
    ], (err, result) => {
      if (err) {
        // return result from findUniqueUsername
        return callback(err, result[0] ? result[0] : null);
      }

      callback(null, null);
    })
  } else {
    return callback('User is not signed in');
  }
}
