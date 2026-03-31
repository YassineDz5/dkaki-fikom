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
    rooms[code]={host:socket.id,players:[{id:socket.id,name,score:0}],phase:'wait'};
    socket.join(code);
    socket.emit('ok-create',{code});
  });
  socket.on('join-room',({code,name})=>{
    const r=rooms[code];
    if(!r){socket.emit('err','الغرفة غير موجودة');return;}
    if(r.players.length>=7){socket.emit('err','الغرفة ممتلئة');return;}
    r.players.push({id:socket.id,name,score:0});
    socket.join(code);
    io.to(code).emit('players',r.players);
    socket.emit('ok-join',{code});
  });
  socket.on('start',({code,qs})=>{
    const r=rooms[code];
    if(!r||r.host!==socket.id)return;
    r.qs=qs;r.qi=0;r.ans={};r.votes={};
    io.to(code).emit('question',{q:r.qs[0],i:0,total:r.qs.length});
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
  socket.on('next',({code,scores})=>{
    const r=rooms[code];if(!r||r.host!==socket.id)return;
    if(scores)scores.forEach(({id,pts})=>{const p=r.players.find(x=>x.id===id);if(p)p.score+=pts;});
    r.qi++;r.ans={};
    if(r.qi>=r.qs.length)io.to(code).emit('final',r.players);
    else io.to(code).emit('question',{q:r.qs[r.qi],i:r.qi,total:r.qs.length});
  });
  socket.on('disconnect',()=>{
    Object.keys(rooms).forEach(code=>{
      const r=rooms[code];if(!r)return;
      r.players=r.players.filter(p=>p.id!==socket.id);
      if(!r.players.length)delete rooms[code];
      else io.to(code).emit('players',r.players);
    });
  });
});
const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log('✅ شغال على port '+PORT));
