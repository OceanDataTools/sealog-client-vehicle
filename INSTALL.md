## Client Installation

Sealog Client is tested on Ubuntu versions 20.04 and 22.04 but will likely work on Ubuntu 24.04, RHEL 9 and Rocky 9 with some adaptation. It is also possible to deploy the server as a container.

### Prerequisites
 - [nodeJS](https://nodejs.org) >=20.x
 - [npm](https://www.npmjs.com) >=6.13.x
 - [git](https://git-scm.com)
 - [nginx](https://nginx.org/)
 
#### Installing NodeJS/npm on Ubuntu 22.04 LTS
Download/run the nvm install script.  You will want to do this as the system user that runs the Sealog-Server services:
```
cd ~
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Install the LTS version of NodeJS (v20.x.x) using `nvm`:
```
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
nvm install --lts
```

#### Installing nginx on Ubuntu 22.04 LTS
Use `apt` to install nginx
```
sudo apt-get install nginx
```

### Install Sealog Client from GitHub

#### Clone the Sealog Client repository
You will want to do this as the system user that runs the Sealog-Server services.
```
cd ~
git clone https://github.com/OceanDataTools/sealog-client-vehicle.git ./sealog-client
```

This will clone the repo to a `sealog-client` sub-directory.

#### Create the configurations files
The settings in the default configuration files are appropriate for most single instance deployments.

Create the working configuration files from the distibution versions:
```
cd ./sealog-client
cp ./src/client_settings.js.dist ./src/client_settings.js
cp ./src/map_tilelayers.js.dist ./src/map_tilelayers.js
cp ./webpack.config.js.dist ./webpack.config.js
```

#### Move installation to production location
It is recommended for most Linux distributions to install Sealog Server to the `/opt` directory:
```
sudo mv sealog-client /opt/
```

#### Install the nodeJS modules
Run the following commands to install the required `npm` libraries
```
cd /opt/sealog-client`
npm install
```

### Build and deploy to nginx
Once the npm libraries are installed the client must be compiled.  To complile the client:
```
cd /opt/sealog-client
npm run build
```
This will create the `/opt/sealog-client/dist` directory containing the compiled client.

#### nginx configuration
Create a nginx configuration file:
```
sudo pico /etc/nginx/sites-available/sealog 
```

Added the following to the configuration file:
```
server {
       listen 80;
       listen [::]:80;

       server_name _;

       root /opt/sealog-client/dist;
       index index.html;

       location / {
               try_files $uri $uri/ =404;
       }
}
```

#### Enable the sealog configuration file
```
sudo ln -s /etc/nginx/sites-available/sealog /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

#### Restart nginx
```
sudo service nginx restart
```
