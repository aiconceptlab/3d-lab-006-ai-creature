import {networkInterfaces} from 'node:os';
const privateIPv4=address=>/^10\./.test(address)||/^192\.168\./.test(address)||/^172\.(1[6-9]|2\d|3[01])\./.test(address);
export function launchAddresses(host,port,interfaces=networkInterfaces()){
  const addresses=[{label:'Local',url:`http://${['0.0.0.0','::'].includes(host)?'127.0.0.1':host.includes(':')?'['+host+']':host}:${port}`}];
  if(!['0.0.0.0','::'].includes(host))return addresses;
  const seen=new Set();
  for(const [name,items] of Object.entries(interfaces))for(const item of items||[]){if(item.internal||!['IPv4',4].includes(item.family)||!privateIPv4(item.address)||seen.has(item.address))continue;seen.add(item.address);addresses.push({label:`LAN (${name})`,url:`http://${item.address}:${port}`});}
  return addresses;
}
