# vesta
**[Vesta Rayan Afzar](http://vestarayanafzar.ir) Framework++**

## Installation
    npm install -g vesta
**Attention:** For full application lifecycle management (source control, deploy, and backup) the Docker (engine & compose) must be installed.  
On Windows and MAC OS these commands must be run from docker terminal.

## Technologies and Frameworks
* Docker
* Git
* CommonJS
* ExpressJS
* TypeScript
* Sass
* Gulp
* Browserify
* Angular
* Material design
* Ionic framework

## Commands
### `vesta create (group/project | project)`
After asking a series of questions the project will be generated by cloning one of the followings:
* Server side
  * [expressJsTemplate](https://github.com/hbtb/expressJsTemplate)
* Client side
  * [materialWebTemplate](https://github.com/hbtb/materialWebTemplate)
  * [ionicCordovaTemplate](https://github.com/hbtb/ionicCordovaTemplate)

All these project are common in some files which are exported to a new project ([commonCodeTemplate](https://github.com/hbtb/commonCodeTemplate)) 
which will be copied/submoduled  into a sub directory of generated project. Even the `vesta` command line tool is using this common code!

If you want to init git repository you have to create them on your remote git repository server before using `vesta create`. 
The most important repository is the commonCode repository. 
### `vesta gen (sass | controller | directive | filter) [options]`
Generate each of the mentioned
* **sass** `vesta gen sass (font|component|directive|page) name`
* **controller** `vesta gen controller name` Based on the type of project this will generate a server side (express) or 
    client side (angular) controller
* **directive** `vesta gen directive name` Generates an angular directive
* **filter** `vesta gen filter name` Generates an angular filter

### `vesta plugin (add | rm) cordova-plugin`
Adding or removing a cordova plugin. Without the `cordova-plugin` all the plugins will be added or removed.
Since there is no JSON config file for listing installed cordova plugins, these plugins will be listed in _vesta.json_ file
### `vesta deploy (httpGitRepository | previousDeployConfigFile)`
After asking `username` and `password` the deploy process starts.
Deploy process only works for projects that are generated by Vesta.
### `vesta backup previousDeployConfigFile`
This will mount all volumes of this project into a _busybox_ image and then export (`docker export`) them into a tar file 
named `backup_yyyymmdd-hhmmss.tar`. The container will be removed.   


1) `previousDeployConfigFile` is the path to the json file generated by `vesta deploy` command