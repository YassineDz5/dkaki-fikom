const express=require('express');
const http=require('http');
const{Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'},pingTimeout:60000,pingInterval:25000});
app.use(express.static('public'));
const rooms={};

io.on('connection',socket=>{
  socket.on('create-room',({code,name})=>{
    rooms[code]={players:[{id:socket.id,name,score:0}],ans:{},votes:{},paused:false};
    socket.join(code);
    socket.emit('ok-create',{code});
    io.to(code).emit('players',rooms[code].players);
  });

  socket.on('join-room',({code,name})=>{
    const r=rooms[code];
    if(!r){socket.emit('err','الغرفة غير موجودة');return;}
    const ex=r.players.find(p=>p.name===name);
    if(ex)ex.id=socket.id;
    else r.players.push({id:socket.id,name,score:0});
    socket.join(code);
    socket.emit('ok-join',{code});
    io.to(code).emit('players',r.players);
  });

  socket.on('rejoin',({code,name})=>{
    const r=rooms[code];if(!r)return;
    const p=r.players.find(x=>x.name===name);
    if(p)p.id=socket.id;
    socket.join(code);
  });

  socket.on('start',({code,qs,timer})=>{
    const r=rooms[code];
    if(!r){console.log('no room:'+code);return;}
    r.qs=qs;r.qi=0;r.ans={};r.votes={};r.timer=timer||30;
    console.log('start room:'+code+' players:'+r.players.length);
    io.to(code).emit('question',{q:r.qs[0],i:0,total:r.qs.length,timer:r.timer});
  });

  socket.on('answer',({code,ans})=>{
    const r=rooms[code];if(!r)return;
    r.ans[socket.id]=ans;
    const done=Object.keys(r.ans).length;
    io.to(code).emit('ans-count',{done,total:r.players.length});
    if(done>=r.players.length)io.to(code).emit('all-ans',r.ans);
  });

  socket.on('vote',({code,vote})=>{
    const r=rooms[code];if(!r)return;
    if(!r.votes)r.votes={};
    r.votes[socket.id]=vote;
    if(Object.keys(r.votes).length>=r.players.length){
      io.to(code).emit('all-votes',{votes:r.votes,ans:r.ans});
      r.votes={};r.ans={};
    }
  });

  socket.on('next',({code})=>{
    const r=rooms[code];if(!r)return;
    r.qi++;r.ans={};
    if(r.qi>=r.qs.length)io.to(code).emit('final',r.players);
    else io.to(code).emit('question',{q:r.qs[r.qi],i:r.qi,total:r.qs.length,timer:r.timer});
  });

  socket.on('update-score',({code,scores})=>{
    const r=rooms[code];if(!r)return;
    scores.forEach(({id,pts})=>{const p=r.players.find(x=>x.id===id);if(p)p.score+=pts;});
    io.to(code).emit('scores-update',r.players);
  });

  socket.on('pause-game',({code,name,seconds})=>{
    const r=rooms[code];if(!r||r.paused)return;
    r.paused=true;
    io.to(code).emit('game-paused',{by:name,seconds:seconds||60});
    r.pauseTimer=setTimeout(()=>{r.paused=false;io.to(code).emit('game-resumed',{});},(seconds||60)*1000);
  });

  socket.on('resume-game',({code})=>{
    const r=rooms[code];if(!r)return;
    if(r.pauseTimer)clearTimeout(r.pauseTimer);
    r.paused=false;io.to(code).emit('game-resumed',{});
  });

  socket.on('kick-player',({code,targetId})=>{
    const r=rooms[code];if(!r)return;
    io.to(targetId).emit('kicked');
    r.players=r.players.filter(p=>p.id!==targetId);
    io.to(code).emit('players',r.players);
  });

  socket.on('chat',({code,name,msg})=>{
    io.to(code).emit('chat',{name,msg});
  });

  socket.on('disconnect',()=>{
    Object.keys(rooms).forEach(code=>{
      const r=rooms[code];if(!r)return;
      const pl=r.players.find(x=>x.id===socket.id);if(!pl)return;
      r.players=r.players.filter(p=>p.id!==socket.id);
      if(!r.players.length){if(r.pauseTimer)clearTimeout(r.pauseTimer);delete rooms[code];}
      else io.to(code).emit('players',r.players);
    });
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log('OK '+PORT));
