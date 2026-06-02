import React from 'react'

function I({ d, size = 18, className, style, fill = 'none', sw = 1.75 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  )
}

export const IconSend         = (p) => <I {...p} d="<line x1='22' y1='2' x2='11' y2='13'/><polygon points='22 2 15 22 11 13 2 9 22 2'/>" />
export const IconSearch       = (p) => <I {...p} d="<circle cx='11' cy='11' r='8'/><line x1='21' y1='21' x2='16.65' y2='16.65'/>" />
export const IconBell         = (p) => <I {...p} d="<path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'/><path d='M13.73 21a2 2 0 0 1-3.46 0'/>" />
export const IconBellOff      = (p) => <I {...p} d="<path d='M13.73 21a2 2 0 0 1-3.46 0'/><path d='M18.63 13A17.89 17.89 0 0 1 18 8'/><path d='M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14'/><path d='M18 8a6 6 0 0 0-9.33-5'/><line x1='1' y1='1' x2='23' y2='23'/>" />
export const IconPlus         = (p) => <I {...p} d="<line x1='12' y1='5' x2='12' y2='19'/><line x1='5' y1='12' x2='19' y2='12'/>" />
export const IconSettings     = (p) => <I {...p} d="<circle cx='12' cy='12' r='3'/><path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z'/>" />
export const IconLogOut       = (p) => <I {...p} d="<path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'/><polyline points='16 17 21 12 16 7'/><line x1='21' y1='12' x2='9' y2='12'/>" />
export const IconMessage      = (p) => <I {...p} d="<path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/>" />
export const IconUsers        = (p) => <I {...p} d="<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/>" />
export const IconUser         = (p) => <I {...p} d="<path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/><circle cx='12' cy='7' r='4'/>" />
export const IconUserPlus     = (p) => <I {...p} d="<path d='M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='8.5' cy='7' r='4'/><line x1='20' y1='8' x2='20' y2='14'/><line x1='23' y1='11' x2='17' y2='11'/>" />
export const IconUserX        = (p) => <I {...p} d="<path d='M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='8.5' cy='7' r='4'/><line x1='18' y1='8' x2='23' y2='13'/><line x1='23' y1='8' x2='18' y2='13'/>" />
export const IconEdit         = (p) => <I {...p} d="<path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/><path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/>" />
export const IconTrash        = (p) => <I {...p} d="<polyline points='3 6 5 6 21 6'/><path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'/>" />
export const IconReply        = (p) => <I {...p} d="<polyline points='9 14 4 9 9 4'/><path d='M20 20v-7a4 4 0 0 0-4-4H4'/>" />
export const IconSmile        = (p) => <I {...p} d="<circle cx='12' cy='12' r='10'/><path d='M8 14s1.5 2 4 2 4-2 4-2'/><line x1='9' y1='9' x2='9.01' y2='9'/><line x1='15' y1='9' x2='15.01' y2='9'/>" />
export const IconX            = (p) => <I {...p} d="<line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/>" />
export const IconCheck        = (p) => <I {...p} d="<polyline points='20 6 9 17 4 12'/>" />
export const IconPaperclip    = (p) => <I {...p} d="<path d='M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'/>" />
export const IconMic          = (p) => <I {...p} d="<path d='M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z'/><path d='M19 10v2a7 7 0 0 1-14 0v-2'/><line x1='12' y1='19' x2='12' y2='23'/><line x1='8' y1='23' x2='16' y2='23'/>" />
export const IconMicOff       = (p) => <I {...p} d="<line x1='1' y1='1' x2='23' y2='23'/><path d='M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6'/><path d='M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23'/><line x1='12' y1='19' x2='12' y2='23'/><line x1='8' y1='23' x2='16' y2='23'/>" />
export const IconHash         = (p) => <I {...p} d="<line x1='4' y1='9' x2='20' y2='9'/><line x1='4' y1='15' x2='20' y2='15'/><line x1='10' y1='3' x2='8' y2='21'/><line x1='16' y1='3' x2='14' y2='21'/>" />
export const IconMoon         = (p) => <I {...p} d="<path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/>" />
export const IconSun          = (p) => <I {...p} d="<circle cx='12' cy='12' r='5'/><line x1='12' y1='1' x2='12' y2='3'/><line x1='12' y1='21' x2='12' y2='23'/><line x1='4.22' y1='4.22' x2='5.64' y2='5.64'/><line x1='18.36' y1='18.36' x2='19.78' y2='19.78'/><line x1='1' y1='12' x2='3' y2='12'/><line x1='21' y1='12' x2='23' y2='12'/><line x1='4.22' y1='19.78' x2='5.64' y2='18.36'/><line x1='18.36' y1='5.64' x2='19.78' y2='4.22'/>" />
export const IconArrowLeft    = (p) => <I {...p} d="<line x1='19' y1='12' x2='5' y2='12'/><polyline points='12 19 5 12 12 5'/>" />
export const IconCamera       = (p) => <I {...p} d="<path d='M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'/><circle cx='12' cy='13' r='4'/>" />
export const IconFile         = (p) => <I {...p} d="<path d='M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z'/><polyline points='13 2 13 9 20 9'/>" />
export const IconShield       = (p) => <I {...p} d="<path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/>" />
export const IconBan          = (p) => <I {...p} d="<circle cx='12' cy='12' r='10'/><line x1='4.93' y1='4.93' x2='19.07' y2='19.07'/>" />
export const IconWallet       = (p) => <I {...p} d="<rect x='2' y='5' width='20' height='14' rx='2'/><path d='M2 10h20'/><circle cx='16' cy='14' r='1' fill='currentColor' stroke='none'/>" />
export const IconInbox        = (p) => <I {...p} d="<polyline points='22 12 16 12 14 15 10 15 8 12 2 12'/><path d='M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'/>" />
export const IconZap          = (p) => <I {...p} d="<polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2'/>" />
export const IconLock         = (p) => <I {...p} d="<rect x='3' y='11' width='18' height='11' rx='2' ry='2'/><path d='M7 11V7a5 5 0 0 1 10 0v4'/>" />
export const IconStar         = (p) => <I {...p} d="<polygon points='12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'/>" />
export const IconHome         = (p) => <I {...p} d="<path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/><polyline points='9 22 9 12 15 12 15 22'/>" />
export const IconSquare       = (p) => <I {...p} d="<rect x='3' y='3' width='18' height='18' rx='2' ry='2'/>" />
export const IconStop         = (p) => <I {...p} d="<rect x='3' y='3' width='18' height='18' rx='2' ry='2'/>" fill="currentColor" sw={0} />
export const IconChevronDown  = (p) => <I {...p} d="<polyline points='6 9 12 15 18 9'/>" />
export const IconImage        = (p) => <I {...p} d="<rect x='3' y='3' width='18' height='18' rx='2' ry='2'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/>" />
export const IconCheckCheck   = (p) => <I {...p} d="<polyline points='17 1 9 9 6 6'/><polyline points='22 6 12 16 9 13'/>" />
export const IconPhone        = (p) => <I {...p} d="<path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l1.17-1.17a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z'/>" />
export const IconPhoneOff     = (p) => <I {...p} d="<path d='M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.45-3.07M5.26 5.26A19.79 19.79 0 0 0 3.32 12a19.79 19.79 0 0 0 3.07 8.63 2 2 0 0 0 2.18.46 12.84 12.84 0 0 0 2.81-.7 2 2 0 0 0 .45-2.11l-1.27-1.27'/><line x1='1' y1='1' x2='23' y2='23'/>" />
export const IconVideo        = (p) => <I {...p} d="<polygon points='23 7 16 12 23 17 23 7'/><rect x='1' y='5' width='15' height='14' rx='2' ry='2'/>" />
export const IconVideoOff     = (p) => <I {...p} d="<path d='M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10'/><line x1='1' y1='1' x2='23' y2='23'/>" />
export const IconVolume2      = (p) => <I {...p} d="<polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'/><path d='M19.07 4.93a10 10 0 0 1 0 14.14'/><path d='M15.54 8.46a5 5 0 0 1 0 7.07'/>" />
export const IconVolumeX      = (p) => <I {...p} d="<polygon points='11 5 6 9 2 9 2 15 6 15 11 19 11 5'/><line x1='23' y1='9' x2='17' y2='15'/><line x1='17' y1='9' x2='23' y2='15'/>" />
export const IconMaximize2    = (p) => <I {...p} d="<polyline points='15 3 21 3 21 9'/><polyline points='9 21 3 21 3 15'/><line x1='21' y1='3' x2='14' y2='10'/><line x1='3' y1='21' x2='10' y2='14'/>" />
export const IconUsersPlus    = (p) => <I {...p} d="<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/><line x1='20' y1='8' x2='20' y2='14'/><line x1='23' y1='11' x2='17' y2='11'/>" />
export const IconChevronRight = (p) => <I {...p} d="<polyline points='9 18 15 12 9 6'/>" />
export const IconCrown        = (p) => <I {...p} d="<path d='M2 20h20'/><path d='M5 20V8l7-5 7 5v12'/><path d='M9 20v-5h6v5'/>" />
