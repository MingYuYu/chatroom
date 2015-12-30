var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {

	io = socketio.listen(server);

	io.set('log level', 1);


	//在此定义每一个用户的处理逻辑
	io.sockets.on('connection', function(socket) {


		//分配用户昵称
		guestNumber = assignGuestNumber(socket, guestNumber, nickNames, namesUsed);

		//加入聊天室
		joinRoom(socket, 'Lobby');

		//处理用户消息
		handleMessageBroadcasting(socket, nickNames);

		//更换用户名
		handleNameChangeAttempts(socket, nickNames, namesUsed);

		handleRoomJoining(socket);

		//用户发出请求时，向其提供依据被占用的聊天室列表
		socket.on('rooms', function() {

			socket.emit('rooms', io.sockets.manager.rooms);

		});

		handleClientDisconnection(socket, nickNames, namesUsed);

	});

}

function assignGuestNumber(socket, guestNumber, nickNames, namesUsed) {

	var name = 'Guest' + guestNumber;
	nickNames[socket.id] = name;
	console.log(name)
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;

}

function joinRoom(socket, room) {

	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + 'has joined' + room + '.'
	});

	var usersInRoom = io.sockets.clients(room);
	if(usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in ' + room + ':';
		for(var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if(userSocketId != socket.id) {
				if( index > 0) {
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
	usersInRoomSummary += ".";
	socket.emit('message', {text: usersInRoomSummary});
	}
}

function handleMessageBroadcasting(socket) {

	socket.on('message', function(message) {
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});

}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {

	socket.on('nameAttempt', function(name) {

		if(name.indexOf('Guest') == 0) {
			socket.emit('nameResult', {
				success: false,
				message: 'Name cannot begin with "Guest".'
			});
		} else {
			if(namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit("nameResult", {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit("message",{
					text: previousName + ' is now konwn as ' + name + "."
				});

			} else {
				socket.emit('nameResult', {
					success: false,
					message: 'That name is already in use.'
				})
			}
		}

	});

}


//更换房间
function handleRoomJoining(socket) {

	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom);
	});

}


//用户断开连接
function handleClientDisconnection(socket) {

	socket.on('disconnect', function() {

		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});

}