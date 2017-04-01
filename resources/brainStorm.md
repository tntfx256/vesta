#Environments
- Vesta.isServer
- Vesta.isDesktop / Vesta.isElectron
- Vesta.isMobile / Vesta.isCordova
- Vesta.isClient / Vesta.isBrowser


# Features
- Everything happens at build time, not run time
- Everything must be plug'n play
- Different types of export (Api Server, Browser, Cordova, Electron)
- Client/Server connection can be based on HTTP/Socket


# Plugin
- Each plugin has a config file containing
  - dependencies
- 

# Modules
- vesta-router (it generates code for `react-router` and `expressJs`)
- vesta-auth (ACL, Accounting, )
- vesta-schema (Database with client side direct connection in development)
- vesta-cordova-* automatically do stuff (writing facade for each cordova plugin that is used
like ngCordova project)

