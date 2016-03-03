# node-omxplayer-sync

## synchronized looping video for raspberry pi &amp; omxplayer!

to install for deployment:

- `git clone` this repository to ~/ on your raspberry pi
- `chmod +x install.sh`
- configure the IP's of all raspberry pis, dive into the .js files and adjust the socket.io IP assignments.

  - at the moment you must manually point to the IP address of the broadcaster from the omx-sync-listen.js, It's a good idea to give at least your broadcaster a [Static IP](https://pihw.wordpress.com/guides/direct-network-connection/in-a-nut-shell-direct-network-connection/) so that this never changes. Its on the roadmap to make this a smoother/simpler process, if you have ideas, drop a line in the issues tab with a suggestion, Ideally this would be able to scan for the broadcaster and connect to it.

- `node omx-sync-broadcast.js path/to/video.mp4` on the main broadcast pi  
- `node omx-sync-listen.js path/to/video.mp4` on all other pis

--------------------------------------------------------------------------------

### Tested on

Node V 5.6.0

omxplayer<br>Build date: Sat, 02 Jan 2016 13:46:33 +0000<br>Version   : f544084 [master]

RASPBIAN JESSIE LITE<br>Release date:2016-02-09<br>Kernel version:4.1

dbus-native@0.2.0<br>socket.io@1.4.5
