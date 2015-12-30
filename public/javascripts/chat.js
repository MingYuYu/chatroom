var Chat = function(socket) {
	this.socket = socket;
};


//发送消息
Chat.prototype.sendMessage = function(room, text) {

	var message = {
		room: room,
		text: text
	};

	this.socket.emit('message',message);

};

//更换房间
Chat.prototype.changeRoom = function(room) {

	this.socket.emit('join', {
		newRoom: room
	});

};

//处理聊天命令

Chat.prototype.processCommand = function(command) {

	var words = command.split(' ');
	var command = words[0].substring(1, words[0].length).toLowerCase();

	var message = false;

	switch(command) {
		case 'join':
			words.shift();
			var room = words.join(' ');
			this.changeRoom(room);
			break;
		case 'nick' :
			words.shift();
			var name = words.join(' ');
			this.socket.emit('nameAttempt', name);
			break;

		default: 
			message = 'Unrecoginzed command.';
			break
	}

	return message;

};


function divEscapedContentElement(message) {
    return $('<div></div>').text(message);
}

function divSystemContentElement(message) {
    return $('<div></div>').html('<i>' + message + '</i>');
}

//处理用户输入
function processUserInput(chatApp, socket) {

	var message = $("#send-message").val();

	var systemMessage;

	if(message.charAt(0) == '/') {
		systemMessage = chatApp.processCommand(message);
		if(systemMessage) {
			$('#message').append(divSystemContentElement(systemMessage));
		}
	} else {
		chatApp.sendMessage($("#room").text(), message);
		$('#message').append(divEscapedContentElement(message));
		$('#message').scrollTop($('#message').prop('scrollHeight'));
	}

}

var socket = io.connect();

$(document).ready(function() {

	var chatApp = new Chat(socket);

	socket.on('nameResult', function(result) {

		var message;

		if(result.succuss) {
			message = 'You are now known as ' + result.name + '.';
		} else {
			message = result.message;
		}

		$('#message').append(divSystemContentElement(message));
 
	});


	socket.on('joinResult', function(result) {
		$('#room').text(result.room);
		$('#message').append(divSystemContentElement('Room changed'));
	});

	socket.on('message', function(message) {

		var newElement = divEscapedContentElement(message.text);

		$('#message').append(newElement);

	});

	socket.on('rooms', function(rooms) {

		$('#room-list').empty();

		for(var room in rooms){
			room = room.substring(1, room.length);
			if(room != '') {
				$('#room-list').append(divEscapedContentElement(room));
			}
		}

		$('#room-list div').click(function() {

			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();

		});

	});

	setInterval(function() {
		socket.emit('rooms');
	}, 1000);

	$('#send-message').focus();

	$('#send-message').submit(function() {
		processUserInput(chatApp,socket);
		return false;
	});

});
