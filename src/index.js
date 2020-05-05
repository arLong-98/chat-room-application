const path = require('path'); //core node module
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');

const {generateMessage, generateLocationMessage} = require('./utils/messages');
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users');

const app = express();
const server = http.createServer(app); //creating server outside of express to easily use socket
const io = socketio(server); //socketio requires raw http server to be passed in

const PORT = process.env.PORT || 3000;

//paths for application
const publicDirectoryPath = path.join(__dirname,'../public');

//setup static directory to serve
app.use(express.static(publicDirectoryPath));


io.on('connection', (socket)=>{
    console.log('New WebSocket Connection');

    socket.on('join',({username, room}, callback)=>{
        const {error, user} = addUser({id:socket.id, username, room})

        if(error){
            return callback(error);
        }
        socket.join(user.room);
        socket.join(user.username);
        
        
        socket.emit('message',generateMessage('Admin','Welcome!')); //emits to a particular connection
        socket.broadcast.to(user.room).emit('message',generateMessage(`${user.username} has joined!`)); //send to everyone but the user
    
        io.to(user.room).emit('roomData',{
            room: user.room,
            users : getUsersInRoom(user.room)
        });
        callback();

    })
    socket.on('sendMessage',(message, callback)=>{
        const filter = new Filter();

        if(filter.isProfane(message))
            {
                return callback('Profanity is not allowed');
            }
        
        console.log('message', message);
        const user = getUser(socket.id);
        console.log('User', user);
        io.to(user.room).emit('message',generateMessage(user.username,message)); //send to everyone
        callback();
    });

    socket.on('sendTaggedMessage', (message,callback)=>{
        const filter = new Filter();
        if(filter.isProfane(message)){
            return callback('Profanity is not allowed');
        }

        const regex =  /[@]\w*\s/gmy ;
        const username = [];
        let m;
        while((m=regex.exec(message)) !== null){
            if(m.index===regex.lastIndex){
                regex.lastIndex++;
            }

            m.forEach((match) => {
                username.push(match.substring(1, match.length-1));
            });
        }

        console.log(username);
        const user = getUser(socket.id);

        io.to(user.username).emit('message', generateMessage(user.username, message));
        username.forEach((reciever)=>{
            io.to(reciever).emit('message', generateMessage(user.username, message));
            callback();
        })
        
    })

    socket.on('sendLocation',(position,callback)=>{
        if(!position)
            return callback('Error in fetching position')
        const url = `https://google.com/maps?q=${position.lat},${position.long}`;
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage',generateLocationMessage(user.username,url));
        callback();
    });

    

    //to run code when some client disconnects
    //this is a built in event
    socket.on('disconnect',()=>{
        const user = removeUser(socket.id);

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left`));
            io.to(user.room).emit('roomData',{
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }

    });


    
})

server.listen(PORT,()=>{
    console.log('Server is up and running on 3000');
})