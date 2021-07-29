import async from 'async';
import _ from 'lodash';
import mongoose from 'mongoose';
const Roles = mongoose.model('Roles');
const Features = mongoose.model('Features');
const User = mongoose.model('User');

// Configure view model for UAC dashboard
export const getViewModel = (req, res) => {
  async.waterfall([
      //retrieve all roles
      (cb) => {
        Roles.find().sort({
            _id: -1
          })
          .lean()
          .exec((err, roles) => {
            if (err) {
              cb(err);
            }

            cb(null, roles);
          });
      },
      (roles, cb) => {
        // retrieve each roles assigned features based on permissions
        async.each(roles, (role, done) => {
          if (role.featurePermissions.length) {
            Features.find({
                'permissions.perm_id': {
                  $in: _.map(role.featurePermissions)
                }
              })
              .lean()
              .exec((err, features) => {
                if (err) {
                  return done(err);
                }
                role.features = _.forEach(features, (feature) => {
                  return _.remove(feature.permissions, (permission) => {
                    return !_.includes(role.featurePermissions, permission.perm_id)
                  });
                })
                delete role.featurePermissions;
                done(null);
              });
          } else {
            delete role.featurePermissions;
            role.features = [];
            done(null);
          }
        }, (err) => {
          if (err) {
            return cb(err);
          }

          cb(null, roles);
        });
      },
      (roles, cb) => {
        // For each role, retrieve every assigned user
        async.each(roles, (role, done) => {
          User.aggregate([{
              $match: {
                roles: {
                  $all: [role._id.toString()]
                }
              }
            }, {
              $project: {
                name: '$username',
                displayName: 1,
                email: 1
              }
            }])
            .exec((err, users) => {
              if (err) {
                return done(err);
              }

              role.users = users ? users : [];
              done(null);
            });
        }, (err) => {
          if (err) {
            return cb(err);
          }

          cb(null, roles);
        });
      },
      (roles, cb) => {
        Features.find()
          .lean()
          .exec((err, features) => {
            if (err) {
              cb(err);
            }

            cb(null, roles, features);
          });
      },
      (roles, features, cb) => {
        User.aggregate([{
          $project: {
            name: "$username",
            displayName: 1,
            email: 1
          }
        }]).exec((err, users) => {
          if (err) {
            cb(err);
          }

          cb(null, {
            roles: roles,
            features: features,
            users: users
          })
        })
      }
    ],
    (err, result) => {
      if (err) {
        return res.status(500).send({
          message: config.helpers.getErrorMessage(err)
        });
      }

      res.status(200).send(result);
    });
}

export const getConfiguration = (req, res) => {
  Features.find()
    .lean()
    .exec((err, features) => {
      if (err) {
        return res.status(500).send({
          error: 'Unable to retrieve menu configuration'
        });
      }

      async.each(features, (feature, done) => {
        if (feature.permissions.length) {
          Roles.find({
              featurePermissions: {
                $in: _.map(feature.permissions, (permission) => {
                  return permission.perm_id
                })
              }
            })
            .select('name')
            .lean()
            .exec((err, roles) => {
              if (err) {
                return done(err);
              }

              feature.roles = _.map(roles, (role) => {
                return role.name;
              });
              delete feature.permissions;
              done(null);
            })
        } else {
          delete feature.permissions;
          done(null);
        }
      }, (err) => {
        if (err) {
          return res.status(500).send({
            message: config.helpers.getErrorMessage(err)
          });
        }

        let response = {
          user: {},
          config: {}
        };

        response.config.menuConfig = features ? features : null;
        response.user = req.user || false;
        if (response.user) {
          // Remove sensitive data
          response.user.password = undefined;
          response.user.salt = undefined;
        }

        res.status(200).send(response);
      });
    });
}
