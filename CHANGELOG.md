# 0.6.3
### Features
* Separating each submodule of common code into new module
* creating multiple controllers from multiple models (without controller name) `vesta gen controller`
* adding controllers with ACL registration (client & server side)
* freezing schema after being created by code generator to prevent accidental changes
### Bug Fixes
* code generator material md-table
* code generator on CRUD controllers 
* routing  

# 0.6.1
### Features
* Moving deploy to project template (deploy.sh script)
### Bug Fixes
* Creating project 

# 0.5.17
### Features
* Loading behind Nginx load balancer



# 0.5.12
### Features
* Installing Docker Compose

# 0.5.11
### Features
* Adding `vesta init` command
* Installing Docker Engine


# 0.5.10
### Features
* SOC on util files 
### Bug Fixes
* import statement for relation field type on model generator


# 0.5.9
### Features
* backup volumes by `docker-compose.yml` file
* instead of exporting container, only the mounted directories are compressed as tar file

# 0.5.4
### Features
* deploy history
### Bug Fixes
* updating docker-compose production in order to be testable in windows
* creating master branch after initiating git repository on generated project
* deploy

# 0.5.3
### Bug Fixes
* package.json path

# 0.5.2
### Features
* Backup
### Bug Fixes
* Deploy

# 0.5.1
### Features
* Deploy
