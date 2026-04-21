from flask import Flask,send_from_directory
from flask_socketio import SocketIO,emit,join_room
import os
app=Flask(__name__,static_folder='public')
socketio=SocketIO(app,cors_allowed_origins='*',async_mode='eventlet')
rooms={}
@app.route('/')
def index():return send_from_directory('public','index.html')
@app.route('/<path:p>')
def static(p):return send_from_directory('public',p)
@socketio.on('create-room')
def create(d):
    from flask_socketio import request as r
    rooms[d['code']]={'players':[{'id':r.sid,'name':d['name'],'score':0}],'ans':{},'votes':{},'qs':[],'qi':0,'timer':30}
    join_room(d['code']);emit('ok-create',{'code':d['code']})
    socketio.emit('players',rooms[d['code']]['players'],room=d['code'])
@socketio.on('join-room')
def join(d):
    from flask_socketio import request as r
    if d['code'] not in rooms:emit('err','غير موجودة');return
    rm=rooms[d['code']];ex=next((p for p in rm['players'] if p['name']==d['name']),None)
    if ex:ex['id']=r.sid
    else:rm['players'].append({'id':r.sid,'name':d['name'],'score':0})
    join_room(d['code']);emit('ok-join',{'code':d['code']})
    socketio.emit('players',rm['players'],room=d['code'])
@socketio.on('start')
def start(d):
    from flask_socketio import request as r
    c=d['code']
    if c not in rooms:rooms[c]={'players':[{'id':r.sid,'name':d.get('name','مضيف'),'score':0}],'ans':{},'votes':{},'qs':[],'qi':0,'timer':30};join_room(c)
    rm=rooms[c];rm['qs']=d['qs'];rm['qi']=0;rm['ans']={};rm['votes']={};rm['timer']=d.get('timer',30)
    socketio.emit('question',{'q':rm['qs'][0],'i':0,'total':len(rm['qs']),'timer':rm['timer']},room=c)
@socketio.on('answer')
def answer(d):
    from flask_socketio import request as r
    c=d['code']
    if c not in rooms:return
    rm=rooms[c];rm['ans'][r.sid]=d['ans']
    socketio.emit('ans-count',{'done':len(rm['ans']),'total':len(rm['players'])},room=c)
    if len(rm['ans'])>=len(rm['players']):socketio.emit('all-ans',rm['ans'],room=c)
@socketio.on('vote')
def vote(d):
    from flask_socketio import request as r
    c=d['code']
    if c not in rooms:return
    rm=rooms[c];rm['votes'][r.sid]=d['vote']
    if len(rm['votes'])>=len(rm['players']):
        socketio.emit('all-votes',{'votes':rm['votes'],'ans':rm['ans']},room=c);rm['votes']={};rm['ans']={}
@socketio.on('next')
def next_q(d):
    c=d['code']
    if c not in rooms:return
    rm=rooms[c];rm['qi']+=1;rm['ans']={}
    if rm['qi']>=len(rm['qs']):socketio.emit('final',rm['players'],room=c)
    else:socketio.emit('question',{'q':rm['qs'][rm['qi']],'i':rm['qi'],'total':len(rm['qs']),'timer':rm['timer']},room=c)
@socketio.on('update-score')
def score(d):
    if d['code'] not in rooms:return
    rm=rooms[d['code']]
    for s in d['scores']:
        p=next((x for x in rm['players'] if x['id']==s['id']),None)
        if p:p['score']+=s['pts']
    socketio.emit('scores-update',rm['players'],room=d['code'])
@socketio.on('chat')
def chat(d):socketio.emit('chat',{'name':d['name'],'msg':d['msg']},room=d['code'])
@socketio.on('pause-game')
def pause(d):
    if d['code'] not in rooms:return
    socketio.emit('game-paused',{'by':d['name'],'seconds':d.get('seconds',60)},room=d['code'])
@socketio.on('resume-game')
def resume(d):
    if d['code'] not in rooms:return
    socketio.emit('game-resumed',{},room=d['code'])
@socketio.on('kick-player')
def kick(d):
    if d['code'] not in rooms:return
    socketio.emit('kicked',{},room=d['targetId'])
    rooms[d['code']]['players']=[p for p in rooms[d['code']]['players'] if p['id']!=d['targetId']]
    socketio.emit('players',rooms[d['code']]['players'],room=d['code'])
@socketio.on('disconnect')
def disc():
    from flask_socketio import request as r
    for c in list(rooms.keys()):
        rm=rooms[c];pl=next((p for p in rm['players'] if p['id']==r.sid),None)
        if not pl:continue
        rm['players']=[p for p in rm['players'] if p['id']!=r.sid]
        if not rm['players']:del rooms[c]
        else:socketio.emit('players',rm['players'],room=c)
if __name__=='__main__':
    socketio.run(app,host='0.0.0.0',port=int(os.environ.get('PORT',3000)))
