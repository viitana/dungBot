const messages = {

  intro:`<b>Welcome to PooBot!</b>  -  a bot that tracks your employer's losses \
due to you pooping on company time!\n\nPlease note that the bot was merely designed \
as a bit of a gag and actual intentional wasting of working time is likely a loss \
for both your employer and yourself!\n\nThe maintainer(s) cannot be held accountable \
for any lectures from your superiors or consequent terminations. Stay productive! 💩`,

  commands: `<b>Available commands:</b>
<i>Note that commands can differ in a private chat/a group chat.</i>

<b>Private chat:</b>
 /intro - Display initial welcome message
 /commands - Display this message
 /start - Register yourself as a user
 /wage <code>&lt;number&gt;</code> - Set your hourly wage
 /nuke - Permanently remove your data (will confirm)
 /poopays - For <a href="https://poopays.com/">PooPays</a> users:  instructions for transfer

 /startpoo - Start a pooing session (start timer)
 /endpoo - End a pooing session (end timer)
 /stats <code>&lt;number&gt;</code> - Display last n (max 10) poo entries
 /graph - Display a graph of your total poo progress

 <b>Group chat:</b>
 /start - Join the poo comptetition in a group chat
 /nuke - Remove yourself from a group competition
 /graph - Display a graph of the group's total poo progress

 <b>Both chats:</b>
 /poops - List total poo count and net worth`,

  poopays: `<code>These instructions are intended for users of the PooPays Android app, which \
offers similar functionality to this bot and was its original inspiration.

The export functionality has been tested but remains experimental.</code>

To bring over your Poopays results, you'll need to manually copy and extract \
the application data and send it to the bot as the developers have not (yet) \
given access to their API endpoint to use PooPays' built-in restore functionality.

<b>There are 3 main methods to copy the data:
(1)</b> With a computer via ABD or,
<b>(2)</b> If on Android Lollipop 5.0 (possibly works on Marshmallow) or earlier by \
using any file manager that can navigate to the <code>/data</code> partition on your phone
<b>(3)</b> On a rooted phone, also literally any other way to acces the <code>poop</code> file at <code>/data/data/com.skiily.www.poopays/databases</code>

<b>Method 1 - Computer via ADB:</b>
- Make sure you have a functional Java installation
- Install latest Android SDK Platform Tools or Mininal ADB and Fastboot (for transfer)
- Download android-backup-extractor (open source extractor)
- Connect to phone via ABD (google instructions if needed)
- Create&pull a backup of Poopays into current directory on PC:
  <code>adb backup -f poopays.ab com.skiily.www.poopays</code>
- Make sure extractor  .jar is in the same dir and extract:
  <code>java -jar abe-all.jar unpack poopays.ab poopays.tar</code>
- Open the generated tar file with any file supporting file extractor (typically buit-in tar on linux, 7zip/WinRAR/etc on Windows)
- In the tar archive, navigate to '<code>apps\\com.skiily.www.poopays\\db</code>' and extract '<code>poop</code>'
- Simply send the file to the bot and it will attempt to import it

<b>Method 2 - On phone with a file manager:</b>
- Open file manager (this example uses FX File Explorer)
- If on Android 5.0 or lower: from the Home screen, navigate to <code>System > data > data > com.skiily.www.poopays > databases</code>
- If rooted: Enable root in the settings and navigate to the same directory via 'System (Root)' on the home screen)
- Send the file <code>poop</code> to the bot and it will attempt to import it

<b>Do not attempt to send the file again</b>, or you'll have to reset your data via /nuke as currently it will simply double the entries.

<code>Intructions last updated 10/9/2019</code>
`
}

export default messages;
