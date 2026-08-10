const http = require('http');
const { Server } = require('socket.io');

const port = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 4000;
const origin = process.env.WS_ORIGIN || 'http://localhost:3000';

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Oda verilerini hafızada tut (Üretimde Redis vb. tercih edilmeli)
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('room:join', (payload) => {
    try {
      const { roomId, userId, userName, movieData } = payload;
      if (!roomId) return;

      socket.join(roomId);
      
      let room = rooms.get(roomId);
      if (!room) {
        room = {
          playing: false,
          time: 0,
          movieData: movieData || null,
          users: new Map(),
          createdAt: Date.now()
        };
      }
      
      room.users.set(socket.id, { userId, userName });
      rooms.set(roomId, room);

      // Yeni kullanıcıya mevcut durumu gönder
      socket.emit('video:sync', { 
        playing: room.playing, 
        time: room.time,
        movieData: room.movieData,
        participants: Array.from(room.users.values())
      });

      // Diğerlerine yeni birinin geldiğini haber ver
      socket.to(roomId).emit('room:user-joined', { 
        userId, 
        userName,
        participants: Array.from(room.users.values())
      });

      console.log(`${userName} joined room: ${roomId}`);
    } catch (err) {
      console.error('Join error:', err);
      socket.emit('error:event', { type: 'room:join', message: 'Odaya katılma başarısız oldu' });
    }
  });

  socket.on('video:play', (payload) => {
    const { roomId, time } = payload;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (room) {
      room.playing = true;
      room.time = time;
      socket.to(roomId).emit('video:play', { time });
    }
  });

  socket.on('video:pause', (payload) => {
    const { roomId, time } = payload;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (room) {
      room.playing = false;
      room.time = time;
      socket.to(roomId).emit('video:pause', { time });
    }
  });

  socket.on('video:seek', (payload) => {
    const { roomId, time } = payload;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (room) {
      room.time = time;
      socket.to(roomId).emit('video:seek', { time });
    }
  });

  socket.on('chat:message', (payload) => {
    const { roomId, text, userId, userName, spoiler } = payload;
    if (!roomId || !text) return;

    const message = {
      id: Date.now().toString(),
      userId,
      userName,
      text,
      spoiler: !!spoiler,
      ts: Date.now()
    };

    io.to(roomId).emit('chat:message', message);
  });

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        const user = room.users.get(socket.id);
        room.users.delete(socket.id);
        
        if (room.users.size === 0) {
          // Oda boşsa 5 dakika sonra sil (geçici kopmalar için)
          setTimeout(() => {
            const currentRoom = rooms.get(roomId);
            if (currentRoom && currentRoom.users.size === 0) {
              rooms.delete(roomId);
              console.log(`Room ${roomId} deleted due to inactivity`);
            }
          }, 300000);
        } else {
          socket.to(roomId).emit('room:user-left', { 
            userId: user?.userId, 
            userName: user?.userName,
            participants: Array.from(room.users.values())
          });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Watch Party WebSocket server listening on port ${port}`);
});
