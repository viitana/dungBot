const groupChatTypes = ['group', 'supergroup', 'channel'];

// Format a moment duration to a nice-ish string
export const prettifyDuration = (duration) => {
  let str = '';
  const d = duration.days();
  const h = duration.hours();
  const m = duration.minutes();
  const s = duration.seconds();
  const ms = duration.milliseconds();
  if (d && d > 0) str += d + ' d ';
  if (h && h > 0) str += h + ' hr ';
  if (m && m > 0) str += m + ' min ';
  if (s && s > 0) str += s + ' s ';
  if (ms && ms > 0) str += ms + ' ms ';
  return str;
}

export const missingTokenErr = (
  '*** BOT TOKEN NOT FOUND ***\n* If trying to run officially, ask Atte for token\n'
  + '* Otherwise generate your own via @BotFather\n* For export instructions, see repo README\n'
  + 'Exiting'
);

// Is a given chat a group chat?
export const isGroupChat = chat => groupChatTypes.includes(chat.type);

export const getName = user => {
  return user.username
    ? user.username
    : user.first_name
    ? user.first_name
    : user.id;
}

export const dbg = (from, str) => {
  if(process.env.debug && from && str) console.log(`[${getName(from)}/${from.id}] ${str}`)
}
