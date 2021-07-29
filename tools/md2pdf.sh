#!/bin/bash
# A simple script to convert md to pdf
# Author: parthi2929
# Need to have a bash shell like git bash to execuite this file in Windows

source1="./docs/**/*.md"
junkloc1="./tex2pdf.*"
title1="./docs/title.txt"
template1="./docs/templates/eisvogel.latex"
target_wot="tools/out/test_wot.pdf"
target_wt="tools/out/test_wt.pdf"

echo "switching to root directory.."
cd "./"
pwd

# conversion WITHOUT latex template
# TESTED 29th July 2021

echo "cleaning up old targets.."
rm -rf $target_wot
echo "Initiaing conversion without latex template"
pandoc \
    --pdf-engine=xelatex \
    -f markdown+rebase_relative_paths \
    -o $target_wot \
    $source1 
echo "Opening the final doc file.."
if [ -f "$target_wot" ]; then
    echo "Opening $target_wt.."
    start $target_wot
else 
    echo "$target_wot does not exist."
fi




# conversion WITH latex template
# TESTED 29th July 2021

# echo "cleaning up old targets.."
# rm -rf $target_wt
# echo "Initiaing conversion with latex template"
# pandoc \
#     --pdf-engine=xelatex \
#     --template=$template1 \
#     --highlight-style tango \
#     --toc -N \
#     --filter pandoc-crossref \
#     -f markdown+rebase_relative_paths \
#     --mathjax \
#     -o $target_wt \
#     $title1 $source1
# echo "Opening the final doc file.."
# if [ -f "$target_wt" ]; then
#     echo "Opening $target_wt.."
#     start $target_wt
# else 
#     echo "$target_wt does not exist."
# fi


# clean up intermediate files
echo "cleaning up intermediate files.."
rm -rf $junkloc1