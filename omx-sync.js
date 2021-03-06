var fs = require('fs');
var rpio = require('rpio');
var config = JSON.parse(fs.readFileSync(process.argv.slice(2)[0], 'utf8'));
var server = require('http').createServer();
var masterIP = config.masterIP
var socket = require('socket.io-client')(`http://${masterIP}:3000`);
// var io = require('socket.io')(server);
var io = require('socket.io')(server, {'pingInterval': 10000, 'pingTimeout': 15000});
var dbus = require('dbus-native');
var exec = require('child_process').exec;
var filePath = config.videoPath
var videoAngle = config.orientation
var aspectMode = config.aspectMode
var firstSyncTime = config.firstSyncTime
var options = `-o hdmi -b --loop --no-osd --orientation ${videoAngle} --aspect-mode ${aspectMode} `
var currentPosition, totalDuration
var bus; //main DBUS
var gate = true;
var omx;
var button = 19 // shutdown pushbuttom

server.listen(3000, function() { console.log( 'Listening on port 3000') });

// PARSE TERMINAL INPUT.
if(filePath == undefined){
  console.log("no video file specified");
  return
}

//kill previous player if the script needs to restart
var killall = exec('killall omxplayer.bin', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});

console.log('current video path: ' + filePath);

//start omx player
omx = exec('omxplayer ' + options + filePath, (error, stdout, stderr) => {
  if (error) {
    console.error(`omxplayer exec error: ${error}`);
    return;
  }
  console.log(`exec omxplayer stdout: ${stdout}`);
  console.log(`exec omxplayer stderr: ${stderr}`);
});

omx.on('exit', function(code){
  console.log('EXIT CODE: '+ code +' @ ' + Date() );
  // relaunch omxplayer
  process.exit(0);

});

//SOCKET.IO HANDLING
io.on('connection', function(socket){
  console.log("Listener connected: " + socket.id + ' @ ' + Date());

  socket.on('disconnect', function(){
    console.log("Listener disconnected: " + socket.id );
  });

});

socket.on('connect', function(){
  console.log("Connected to the broadcaster as: " + socket.id + ' @ ' + Date() );

});

socket.on('shutDown', function(shutDown){
  console.log('shutDown flag recieved  @ ' + Date());
  setTimeout(function(){
    //kill previous player if the script needs to restart
    var killall = exec('killall omxplayer.bin', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      exec('sudo halt', (error, stdout, stderr) => {
        if (error) {
          console.error(`halt exec error: ${error}`);
          return;
        }
        console.log(`exec halt stdout: ${stdout}`);
      });
    });
  },1000)
})

socket.on('loopFlag', function(loopFlag){
  console.log('loop flag recieved  @ ' + Date());
  seek( s2micro(1) );
  setTimeout(function(){
    gate = true;
  },1000)
})
socket.on('goToZero', function(loopFlag){
  console.log('goToZero flag recieved  @ ' + Date());
  seek( s2micro(1) );
})

rpio.init({mapping: 'gpio'})
rpio.open(button, rpio.INPUT, rpio.PULL_UP);
function checkShutdown()
{
        if(!rpio.read(button)){
          //if reset is pressed then shutdown
          io.emit('shutDown', { shutDown : 'true' });
        }
}
setInterval(checkShutdown, 1000); //everySecond

//DBUS HANDLING
setTimeout(function(){ //wait for dbus to become available.

  bus = dbus.sessionBus({
          busAddress: fs.readFileSync('/tmp/omxplayerdbus.pi', 'ascii').trim()
  });

  setTimeout(function(){
    bus.invoke({
            path: "/org/mpris/MediaPlayer2",
            interface: "org.freedesktop.DBus.Properties",
            member: "Duration",
            destination: "org.mpris.MediaPlayer2.omxplayer",
    }, function(err, duration) {
            totalDuration = duration; //set to a global
            console.log("Duration: " + totalDuration);
    });
    setTimeout(function(){
      io.emit('goToZero', { goToZero : 0 })
    }, firstSyncTime);
    //send out loop flag
    setInterval(function(){
      bus.invoke({
              path: "/org/mpris/MediaPlayer2",
              interface: "org.freedesktop.DBus.Properties",
              member: "Position",
              destination: "org.mpris.MediaPlayer2.omxplayer",
      }, function(err, position) {
              currentPosition = position; //set to a global
              // console.log("CP: " + currentPosition);
      });


      if(currentPosition >= totalDuration - s2micro(1) && gate == true){ //are we in the end range of the file?
        gate = false;
        console.log( "*File Ended @ " + Date() );
        io.emit('loopFlag', { loopFlag : 'loop' }); //add one of these above outside the interval loop to reset when the server boots?
      }

    },250);

  }, 1000)
}, 1000);

function seek(pos){
  bus.invoke({
          path: "/org/mpris/MediaPlayer2",
          interface: "org.mpris.MediaPlayer2.Player",
          member: "SetPosition",
          destination: "org.mpris.MediaPlayer2.omxplayer",
          signature: "ox",
          body: [ '/not/used', pos ]
  }, function(err) {
    if(err != null){
          console.log("ERROR: "+err);
        }
  });

}

function s2micro(seconds){
  return seconds * 1000000;
}
