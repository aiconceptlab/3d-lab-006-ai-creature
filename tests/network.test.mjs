import test from 'node:test';import assert from 'node:assert/strict';import {launchAddresses} from '../server/network.mjs';
test('LAN startup prints private IPv4 adapters and omits loopback, link-local, public and duplicates',()=>{
  const nic={Ethernet:[{family:'IPv4',address:'192.168.0.136',internal:false}],WiFi:[{family:4,address:'10.0.1.4',internal:false}],Ignored:[{family:'IPv4',address:'192.168.0.136',internal:false},{family:'IPv4',address:'169.254.1.2',internal:false},{family:'IPv4',address:'203.0.113.2',internal:false},{family:'IPv6',address:'::1',internal:true}]};
  assert.deepEqual(launchAddresses('0.0.0.0',3019,nic).map(a=>a.url),['http://127.0.0.1:3019','http://192.168.0.136:3019','http://10.0.1.4:3019']);
  assert.deepEqual(launchAddresses('127.0.0.1',3019,nic),[{label:'Local',url:'http://127.0.0.1:3019'}]);
});
