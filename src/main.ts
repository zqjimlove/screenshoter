declare var require;
declare var phantom;

import Client from "./client";

try{
    let client = new Client();
}catch(e){
    console.error(e.message);
    phantom.exit();
}


