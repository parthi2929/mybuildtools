This is a list of scripts one could use for various document generation for their systems engineering. These are the tools I created while contributing to personal/client projects of my own, which I find could be useful to any one who wants to re use. I have mostly tried to re use existing tools, and adapted them to my needs as much as possible. 

I understand the organization here is still a mess. I firstly wanted to get it to a repo so as to use for multiple projects, while also continuing to tweak and include new tools as my needs grow. Please feel free to improvise. 

_Usage:_

Considering a typical project layout, the tools are placed in tools folder, and access the relevant `docs` or `src` example contents, to generate demo outputs, again within tools folder itself. This way, user could replace doc content in `docs` folder with theirs, src content in `src` folder with theirs, and proceed using the tools. 

_Folder Structure:_  

* docs
  * 01
  * 02
  * assets
  * templates
  * title.txt
* src
  * MEANcore
* tools
  * out
  * dgraph.sh
  * md2pdf.sh
* .gitignore
* README.md


##### md2pdf

This converts collection of markdown files to single pdf, typeset by latex engine of choice. The script can be modified to include latex template as well. 

As there is no single universal standard for markdown, this setup is typically hacky. There are few items taht work fine in markdown, but may break in latex. So the final pdf has to be inspected even if no errors thrown by script. 

I have used [pandoc latex template](https://github.com/Wandmalfarbe/pandoc-latex-template) as core base reference here. You could modify the script to either use latex template or not. Please check script for further hints.

_Demo:_

Assuming
* our current folder is `(root folder)`
* md2pdf script path is `(root folder)/tools/md2pdf.sh`

Execute below command in bash shell
```
tools/md2pdf.sh
```

The pdf file can be found in `(root folder)/tools/out` folder. 

| Without Template | With Template |
|---|---|
| <img src="docs/assets/md2pdf_demo01.png" width="350"> | <img src="docs/assets/md2pdf_demo02.png" width="350"> |


##### dgraph

This creates a dependency graph for given web stack project. Tested only with `.js`, and `.ts` for now. The script uses [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) with some tweaks. Your tweak could depend on how far and structurally you want to view the files and folders. I wanted a simple high level overview. 

I have used [MEANCore](https://github.com/mrdav30/MEANcore) as source project, a MEAN stack boilerplate.

_Demo:_

Assuming, 
* our current folder is `(root folder)`
* dgraph script path is `(root folder)/tools/dgraph.sh`
* source folders are 1 back from script path, that is, `(root folder)/src`

Execute below command from bash shell
```
tools/dgraphs.sh
```

The image files can be found in `(root folder)/tools/out` folder. Both png and svg are generated for demo.

| Dgraph Demo |
|---|
| <img src="tools/out/test.png" width="500"> |


##### Tips

* Clean the `desktop.ini` nuisance in your bash script from root folder as below. 

> find -name desktop.ini -delete






