const express=require('express');
const http=require('http');
const{Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'}});
app.use(express.static('public'));
const rooms={};

io.on('connection',socket=>{
  socket.on('create-room',({code,name})=>{
    rooms[code]={host:socket.id,players:[{id:socket.id,name,score:0}],ans:{},votes:{},paused:false};
    socket.join(code);
    socket.emit('ok-create',{code});
    io.to(code).emit('players',rooms[code].players);
  });

  socket.on('join-room',({code,name})=>{
    const r=rooms[code];
    if(!r){socket.emit('err','الغرفة غير موجودة');return;}
    r.players.push({id:socket.id,name,score:0});
    socket.join(code);
    io.to(code).emit('players',r.players);
    socket.emit('ok-join',{code});
  });

  socket.on('start',({code,qs,timer})=>{
    const r=rooms[code];
    if(!r)return;
    r.qs=qs;r.qi=0;r.ans={};r.votes={};r.timer=timer||30;
    // أعد الانضمام للغرفة لضمان الاستقبال
    socket.join(code);
    // أرسل للغرفة كلها + مباشرة للمرسل
    const qData={q:r.qs[0],i:0,total:r.qs.length,timer:r.timer};
    io.to(code).emit("question",qData);socket.emit("question",qData);
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
    r.pauseTimer=setTimeout(()=>{r.paused=false;io.to(code).emit('game-resumed');},(seconds||60)*1000);
  });

  socket.on('resume-game',({code})=>{
    const r=rooms[code];if(!r)return;
    if(r.pauseTimer)clearTimeout(r.pauseTimer);
    r.paused=false;
    io.to(code).emit('game-resumed');
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
      else{
        if(r.host===socket.id)r.host=r.players[0].id;
        io.to(code).emit('players',r.players);
      }
    });
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log('OK '+PORT));
