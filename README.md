# VentuzBot

## Installation:

``` bash
git clone https://github.com/corylulu/VentuzBot
cd VentuzBot
npm install
```

## Configure

Edit `config.json` and enter the Discord bots token. Also set the `testMode` to true/false to configure weather it should send requests to a local test environment or to the ventuz servers. 
```
{
    "token" : "<ENTER_DISCORD_TOKEN>",
    "testMode" : true,
    ...
}
```

## Run

``` bash
node index.js
```

## Usage

In any of the Wishlist/Feature Requests channels, using the command `!request`, `!feedback`, `!bug`, `!idea` (or the emoji equivilent) will log the proceeding message to the internal Ventuz feedback system. 

#### Working Discrod Commands: 

```
!request Undo! 
```
```
:request: People need UNDO! Please add!
```
```
!bug THERE IS NO UNDO!
```
