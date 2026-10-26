const {test} = require('node:test');
const assert = require('node:assert/strict');
const {once} = require('node:events');
const {io: connect} = require('socket.io-client');
const {createChatServer} = require('../index');

async function fixture(t) {
  const {httpServer, io} = createChatServer();
  const sockets = [];
  t.after(async () => {
    sockets.forEach(socket => socket.disconnect());
    await new Promise(resolve => io.close(resolve));
  });
  httpServer.listen(0, '127.0.0.1');
  await once(httpServer, 'listening');
  const url = `http://127.0.0.1:${httpServer.address().port}`;
  async function client() {
    const socket = connect(url, {autoConnect: false, reconnection: false});
    sockets.push(socket);
    const ready = once(socket, 'connect');
    socket.connect();
    await ready;
    return socket;
  }
  return {client, url};
}

function emit(socket, event, payload) {
  return socket.timeout(2000).emitWithAck(event, payload);
}
function join(socket, name, clientId = name) {
  return emit(socket, 'user:join', {name, clientId});
}
function nextMessage(socket) {
  return once(socket, 'message:new', {signal: AbortSignal.timeout(2000)});
}

test('broadcasts a message once to sender and all other group members', {timeout: 10000}, async t => {
  const {client, url} = await fixture(t);
  assert.deepEqual(await (await fetch(`${url}/health`)).json(), {status: 'ok'});
  const [alice, bob, carol] = await Promise.all([client(), client(), client()]);
  await join(alice, 'Alice');
  await join(bob, 'Bob');
  const joined = await join(carol, 'Carol');
  assert.equal(joined.userCount, 3);
  const messages = [nextMessage(alice), nextMessage(bob), nextMessage(carol)];
  const sent = await emit(alice, 'message:send', {text: '  Xin chào cả nhóm 👋  ', name: 'Fake'});
  assert.equal(sent.ok, true);
  for (const [message] of await Promise.all(messages)) {
    assert.deepEqual(message, sent.message);
    assert.equal(message.text, 'Xin chào cả nhóm 👋');
    assert.equal(message.name, 'Alice');
    assert.equal(message.senderId, 'Alice');
  }
});

test('rejects empty names, invalid payloads, and messages from clients that have not joined', {timeout: 10000}, async t => {
  const {client} = await fixture(t);
  const socket = await client();
  assert.equal((await join(socket, '   ', 'valid')).ok, false);
  assert.equal((await emit(socket, 'user:join', null)).ok, false);
  assert.equal((await join(socket, 'a'.repeat(41))).ok, false);
  assert.equal((await emit(socket, 'message:send', {text: 'Hello'})).ok, false);
  await join(socket, 'Alice');
  for (const payload of [null, {}, {text: '   '}, {text: 123}, {text: 'x'.repeat(1001)}]) {
    assert.equal((await emit(socket, 'message:send', payload)).ok, false);
  }
});

test('announces join/leave, rejoins without duplicate membership, and restores history', {timeout: 10000}, async t => {
  const {client} = await fixture(t);
  const alice = await client();
  await join(alice, 'Alice');
  const bob = await client();
  const joining = nextMessage(alice);
  await join(bob, 'Bob');
  assert.equal((await joining)[0].text, 'Bob joined the group.');
  const duplicate = await join(bob, 'Bob');
  assert.equal(duplicate.userCount, 2);
  assert.equal(duplicate.messages.filter(m => m.text === 'Bob joined the group.').length, 1);
  const leaving = nextMessage(alice);
  const count = once(alice, 'users:count');
  bob.disconnect();
  assert.equal((await leaving)[0].text, 'Bob left the group.');
  assert.equal((await count)[0], 1);
  await emit(alice, 'message:send', {text: 'While Bob was away'});
  const connected = once(bob, 'connect');
  bob.connect();
  await connected;
  const rejoined = await join(bob, 'Bob');
  assert.equal(rejoined.userCount, 2);
  assert.ok(rejoined.messages.some(m => m.text === 'While Bob was away'));
});

test('supports users with the same name and keeps only the latest 100 entries', {timeout: 10000}, async t => {
  const {client} = await fixture(t);
  const alice = await client();
  const otherAlice = await client();
  await join(alice, 'Alice', 'alice_1');
  await join(otherAlice, 'Alice', 'alice_2');
  for (let i = 0; i < 105; i++) {
    assert.equal((await emit(alice, 'message:send', {text: `Message ${i}`})).ok, true);
  }
  const reply = await join(otherAlice, 'Alice', 'alice_2');
  assert.equal(reply.messages.length, 100);
  assert.equal(reply.messages[0].text, 'Message 5');
  assert.equal(reply.messages.at(-1).text, 'Message 104');
});
