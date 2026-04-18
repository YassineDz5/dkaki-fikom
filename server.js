const express=require('express');
const http=require('http');
const{Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'}});
app.use(express.static('public'));
const rooms={};

function emitToRoom(code,event,data){
  const r=rooms[code];if(!r)return;
  r.players.forEach(p=>io.to(p.id).emit(event,data));
}

io.on('connection',socket=>{
  socket.on('create-room',({code,name})=>{
    rooms[code]={players:[{id:socket.id,name,score:0}],ans:{},votes:{},paused:false};
    socket.emit('ok-create',{code});
    emitToRoom(code,'players',rooms[code].players);
  });

  socket.on('join-room',({code,name})=>{
    const r=rooms[code];
    if(!r){socket.emit('err','الغرفة غير موجودة');return;}
    // تحديث id إذا كان الاسم موجود
    const existing=r.players.find(p=>p.name===name);
    if(existing){existing.id=socket.id;}
    else{r.players.push({id:socket.id,name,score:0});}
    socket.emit('ok-join',{code});
    emitToRoom(code,'players',r.players);
  });

  socket.on('start',({code,qs,timer})=>{
    const r=rooms[code];if(!r)return;
    r.qs=qs;r.qi=0;r.ans={};r.votes={};r.timer=timer||30;
    const qData={q:r.qs[0],i:0,total:r.qs.length,timer:r.timer};
    emitToRoom(code,'question',qData);
  });

  socket.on('answer',({code,ans})=>{
    const r=rooms[code];if(!r)return;
    r.ans[socket.id]=ans;
    const done=Object.keys(r.ans).length;
    emitToRoom(code,'ans-count',{done,total:r.players.length});
    if(done>=r.players.length)emitToRoom(code,'all-ans',r.ans);
  });

  socket.on('vote',({code,vote})=>{
    const r=rooms[code];if(!r)return;
    if(!r.votes)r.votes={};
    r.votes[socket.id]=vote;
    if(Object.keys(r.votes).length>=r.players.length){
      emitToRoom(code,'all-votes',{votes:r.votes,ans:r.ans});
      r.votes={};r.ans={};
    }
  });

  socket.on('next',({code})=>{
    const r=rooms[code];if(!r)return;
    r.qi++;r.ans={};
    if(r.qi>=r.qs.length)emitToRoom(code,'final',r.players);
    else emitToRoom(code,'question',{q:r.qs[r.qi],i:r.qi,total:r.qs.length,timer:r.timer});
  });

  socket.on('update-score',({code,scores})=>{
    const r=rooms[code];if(!r)return;
    scores.forEach(({id,pts})=>{const p=r.players.find(x=>x.id===id);if(p)p.score+=pts;});
    emitToRoom(code,'scores-update',r.players);
  });

  socket.on('pause-game',({code,name,seconds})=>{
    const r=rooms[code];if(!r||r.paused)return;
    r.paused=true;
    emitToRoom(code,'game-paused',{by:name,seconds:seconds||60});
    r.pauseTimer=setTimeout(()=>{r.paused=false;emitToRoom(code,'game-resumed',{});},(seconds||60)*1000);
  });

  socket.on('resume-game',({code})=>{
    const r=rooms[code];if(!r)return;
    if(r.pauseTimer)clearTimeout(r.pauseTimer);
    r.paused=false;emitToRoom(code,'game-resumed',{});
  });

  socket.on('kick-player',({code,targetId})=>{
    const r=rooms[code];if(!r)return;
    io.to(targetId).emit('kicked');
    r.players=r.players.filter(p=>p.id!==targetId);
    emitToRoom(code,'players',r.players);
  });

  socket.on('chat',({code,name,msg})=>{
    emitToRoom(code,'chat',{name,msg});
  });

  socket.on('disconnect',()=>{
    Object.keys(rooms).forEach(code=>{
      const r=rooms[code];if(!r)return;
      const pl=r.players.find(x=>x.id===socket.id);if(!pl)return;
      r.players=r.players.filter(p=>p.id!==socket.id);
      if(!r.players.length){if(r.pauseTimer)clearTimeout(r.pauseTimer);delete rooms[code];}
      else emitToRoom(code,'players',r.players);
    });
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log('OK '+PORT));
