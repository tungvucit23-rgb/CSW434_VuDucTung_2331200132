const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { Server } = require('socket.io');

function createChatServer() {
  const httpServer = http.createServer((req, res) => {
    res.writeHead(req.url === '/health' ? 200 : 404, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(req.url === '/health' ? {status: 'ok'} : {error: 'Not found'}));
  });
  const io = new Server(httpServer);
  const members = new Map();
  const history = [];

  function publish(message) {
    const entry = {id: randomUUID(), createdAt: new Date().toISOString(), ...message};
    history.push(entry);
    if (history.length > 100) history.shift();
    io.to('group').emit('message:new', entry);
    return entry;
  }

  io.on('connection', socket => {
    socket.on('user:join', (payload, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const name = typeof payload?.name === 'string' ? payload.name.trim() : '';
      const clientId = payload?.clientId;
      if (!name || name.length > 40 || typeof clientId !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,80}$/.test(clientId)) {
        return reply({ok: false, error: 'Enter a name between 1 and 40 characters.'});
      }
      if (members.has(socket.id)) {
        return reply({ok: true, messages: [...history], userCount: members.size});
      }
      members.set(socket.id, {name, clientId});
      socket.join('group');
      publish({type: 'system', text: `${name} joined the group.`});
      io.to('group').emit('users:count', members.size);
      reply({ok: true, messages: [...history], userCount: members.size});
    });

    socket.on('message:send', (payload, callback) => {
      const reply = typeof callback === 'function' ? callback : () => {};
      const member = members.get(socket.id);
      if (!member) return reply({ok: false, error: 'Join the group before sending a message.'});
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      if (!text || text.length > 1000) {
        return reply({ok: false, error: 'Messages must contain 1 to 1000 characters.'});
      }
      const message = publish({type: 'chat', senderId: member.clientId, name: member.name, text});
      reply({ok: true, message});
    });

    socket.on('disconnect', () => {
      const member = members.get(socket.id);
      if (!member) return;
      members.delete(socket.id);
      publish({type: 'system', text: `${member.name} left the group.`});
      io.to('group').emit('users:count', members.size);
    });
  });
  return {httpServer, io};
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const {httpServer} = createChatServer();
  httpServer.on('error', error => {
    console.error(`Cannot start chat server: ${error.message}`);
    process.exitCode = 1;
  });
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Group chat server listening on http://0.0.0.0:${port}`);
  });
}
module.exports = {createChatServer};
