import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTenantContextResponse } from '../src/tenant-context-bootstrap.js';
const owner = { tenant_id:'tenant-1', tenant_slug:'muhaimin-dairy-test2', tenant_name:'মুহাইমিন ডেইরি', tenant_status:'pending', membership_role:'owner', membership_status:'active', can_operate:false };
test('pending tenant remains non-operational', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:'main_admin',memberships:[owner],write_authority:false},'user-1');
 assert.equal(r.ok,true); assert.equal(r.status,'tenant_not_operational'); assert.equal(r.selectedTenant,null); assert.equal(r.writeAuthority,false);
});
test('one operational membership is selected', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:'customer',memberships:[{...owner,tenant_status:'active',can_operate:true}],write_authority:false},'user-1');
 assert.equal(r.status,'ready'); assert.equal(r.selectedTenant.tenantId,'tenant-1');
});
test('multiple operational memberships require explicit selection', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:'customer',memberships:[{...owner,tenant_status:'active',can_operate:true},{...owner,tenant_id:'tenant-2',tenant_slug:'second',tenant_status:'active',can_operate:true}],write_authority:false},'user-1');
 assert.equal(r.status,'tenant_selection_required'); assert.equal(r.selectedTenant,null);
});
test('no membership returns no access context', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:null,memberships:[],write_authority:false},'user-1');
 assert.equal(r.status,'no_membership'); assert.equal(r.writeAuthority,false);
});
test('identity mismatch fails closed', () => {
 const r=validateTenantContextResponse({user_id:'other',platform_role:'main_admin',memberships:[owner],write_authority:false},'user-1');
 assert.deepEqual(r,{ok:false,reason:'identity_mismatch'});
});
test('write authority is rejected', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:'main_admin',memberships:[owner],write_authority:true},'user-1');
 assert.deepEqual(r,{ok:false,reason:'unsafe_authority_flag'});
});
test('malformed membership fails closed', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:'main_admin',memberships:[{...owner,tenant_id:''}],write_authority:false},'user-1');
 assert.deepEqual(r,{ok:false,reason:'invalid_membership_record'});
});

test('can_operate cannot contradict tenant or membership status', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:'main_admin',memberships:[{...owner,can_operate:true}],write_authority:false},'user-1');
 assert.deepEqual(r,{ok:false,reason:'invalid_membership_record'});
});
test('duplicate tenant memberships fail closed', () => {
 const r=validateTenantContextResponse({user_id:'user-1',platform_role:'main_admin',memberships:[owner,owner],write_authority:false},'user-1');
 assert.deepEqual(r,{ok:false,reason:'duplicate_membership'});
});
import { loadTenantContext } from '../src/tenant-context-bootstrap.js';
test('signed-out session does not call the Edge Function', async () => {
 let invoked=false;
 const client={auth:{getSession:async()=>({data:{session:null},error:null})},functions:{invoke:async()=>{invoked=true;return {data:null,error:null};}}};
 const r=await loadTenantContext(client);
 assert.deepEqual(r,{ok:false,status:'unauthenticated'}); assert.equal(invoked,false);
});
test('authenticated session invokes only the read-only context endpoint', async () => {
 let calls=0;
 const session={user:{id:'user-1'}};
 const client={auth:{getSession:async()=>({data:{session},error:null})},functions:{invoke:async(name,options)=>{calls++;assert.equal(name,'tenant-context');assert.deepEqual(options,{body:{}});return {data:{user_id:'user-1',platform_role:'main_admin',memberships:[owner],write_authority:false},error:null};}}};
 const r=await loadTenantContext(client);
 assert.equal(calls,1); assert.equal(r.ok,true); assert.equal(r.status,'tenant_not_operational'); assert.equal(r.writeAuthority,false);
});
test('session switch during request discards the response', async () => {
 let reads=0;
 const client={auth:{getSession:async()=>({data:{session:{user:{id:++reads===1?'user-1':'user-2'}}},error:null})},functions:{invoke:async()=>({data:{user_id:'user-1',platform_role:'main_admin',memberships:[owner],write_authority:false},error:null})}};
 const r=await loadTenantContext(client);
 assert.deepEqual(r,{ok:false,status:'session_changed'});
});
test('Edge Function error fails closed', async () => {
 const session={user:{id:'user-1'}};
 const client={auth:{getSession:async()=>({data:{session},error:null})},functions:{invoke:async()=>({data:null,error:new Error('unauthorized')})}};
 const r=await loadTenantContext(client);
 assert.deepEqual(r,{ok:false,status:'endpoint_unavailable'});
});