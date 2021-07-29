
#!/bin/bash
# A simple script to convert md to pdf
# Author: parthi2929
# Need to have a bash shell like git bash to execuite this file in Windows

source1="../src" 
includeOnly="src/(.*)\.(ts|js)"
target_png1="../tools/out/test.png"
target_svg1="../tools/out/test.svg"

# the working path depends on where the script is run from..
echo `pwd`  # differs if I call from root folder or from script folder

# lets fix it, first move to script folder
# thanks: https://stackoverflow.com/a/3355423
cd "$(dirname "$0")"
echo `pwd` # test


# SRC
# if png
depcruise --output-type dot $source1 \
--include-only $includeOnly \
--max-depth 4 \
--collapse 5 \
| dot -Gdpi=300 -T png > $target_png1
# if svg
depcruise --output-type dot $source1 \
--include-only $includeOnly \
--max-depth 4 \
--collapse 5 \
| dot -T svg > $target_svg1





