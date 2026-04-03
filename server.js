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
    rooms[code]={host:socket.id,players:[{id:socket.id,name,score:0,correct:0,games:0}],phase:'wait'};
    socket.join(code);
    socket.emit('ok-create',{code});
    io.to(code).emit('players',rooms[code].players);
  });

  socket.on('join-room',({code,name})=>{
    const r=rooms[code];
    if(!r){socket.emit('err','الغرفة غير موجودة');return;}
    if(r.players.length>=8){socket.emit('err','الغرفة ممتلئة');return;}
    r.players.push({id:socket.id,name,score:0,correct:0,games:0});
    socket.join(code);
    io.to(code).emit('players',r.players);
    socket.emit('ok-join',{code});
  });

  socket.on('start',({code,qs,timer})=>{
    const r=rooms[code];
    if(!r||r.host!==socket.id)return;
    r.qs=qs;r.qi=0;r.ans={};r.votes={};r.timer=timer||30;
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

  socket.on('next',({code,scores})=>{
    const r=rooms[code];if(!r||r.host!==socket.id)return;
    if(scores&&scores.length){
      scores.forEach(({id,pts})=>{
        const p=r.players.find(x=>x.id===id);
        if(p){p.score+=pts;if(pts>0)p.correct++;}
      });
    }
    r.qi++;r.ans={};
    if(r.qi>=r.qs.length){
      r.players.forEach(p=>p.games++);
      io.to(code).emit('final',r.players);
    }else{
      io.to(code).emit('question',{q:r.qs[r.qi],i:r.qi,total:r.qs.length,timer:r.timer});
    }
  });

  socket.on('update-score',({code,scores})=>{
    const r=rooms[code];if(!r)return;
    scores.forEach(({id,pts})=>{
      const p=r.players.find(x=>x.id===id);
      if(p)p.score+=pts;
    });
    io.to(code).emit('scores-update',r.players);
  });

  socket.on('chat',({code,name,msg})=>{
    io.to(code).emit('chat',{name,msg,time:new Date().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})});
  });

  socket.on('disconnect',()=>{
    Object.keys(rooms).forEach(code=>{
      const r=rooms[code];if(!r)return;
      const p=r.players.find(x=>x.id===socket.id);
      if(!p)return;
      r.players=r.players.filter(p=>p.id!==socket.id);
      if(!r.players.length)delete rooms[code];
      else{
        if(r.host===socket.id&&r.players.length>0)r.host=r.players[0].id;
        io.to(code).emit('players',r.players);
        io.to(code).emit('chat',{name:'النظام',msg:`${p.name} غادر اللعبة`,time:'',sys:true});
      }
    });
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log('✅ شغال على port '+PORT));
