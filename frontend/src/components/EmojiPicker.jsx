import React, { useState, useMemo } from 'react'

const CATEGORIES = [
  { label: '😊', name: 'Smileys', vi: 'mặt cười biểu cảm', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😗','😋','😛','😜','🤪','😝','🤑','🤗','🤔','🤐','😐','😑','😶','😏','😒','🙄','😬','🤥','😔','😪','😴','😷','🤒','🤕','🥵','🥶','😵','🤯','🤠','🥳','😎','😕','😟','🙁','☹','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😩','😫','🥱'] },
  { label: '👋', name: 'Gestures', vi: 'cử chỉ tay người', emojis: ['👍','👎','👋','🤚','🖐','✋','🖖','👌','🤌','✌','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝','👏','🙌','🤝','🤲','🙏','✍','💅','🤳','💪','🦾','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄'] },
  { label: '❤', name: 'Hearts', vi: 'tim yêu thương', emojis: ['❤','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣','💕','💞','💓','💗','💖','💘','💝','💟','♥','💋','💌','💍','💎'] },
  { label: '🐶', name: 'Animals', vi: 'động vật thú cưng', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🦋','🐛','🐌','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🦈','🐊','🐅','🐆','🦓','🦍','🦧'] },
  { label: '🍎', name: 'Food', vi: 'đồ ăn thức uống', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🫑','🥬','🥒','🌶','🫒','🧄','🧅','🥔','🌽','🍠','🥐','🥯','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥪','🥙','🧆','🌮','🌯','🫔','🥗','🥘','🫕','🍜','🍝','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍚','🍘','🍥','🥮','🍢','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','🍵','☕','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉'] },
  { label: '⚽', name: 'Activities', vi: 'thể thao hoạt động âm nhạc', emojis: ['⚽','🏀','🏈','⚾','🥎','🏐','🏉','🎾','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸','🥌','🎿','⛷','🏂','🪂','🏋','🤸','🤼','🤺','🏇','⛹','🏊','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖','🎗','🎫','🎟','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🪘','🥁','🎷','🎺','🎸','🪕','🎻'] },
  { label: '🌍', name: 'Travel', vi: 'du lịch địa điểm phương tiện', emojis: ['🌍','🌎','🌏','🌐','🗺','🧭','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🏟','🏛','🏗','🧱','🏘','🏚','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩','🕋','⛲','⛺','🌁','🌃','🏙','🌄','🌅','🌆','🌇','🌉','♨','🎠','🎡','🎢','💈','🎪','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🚚','🚛','🚜','🏎','🏍','🛵','🛺','🚲','🛴','🛹','🛼','🚏','🛣','🛤','⛽','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🚤','🛥','🛳','⛴','🚢','✈','🛩','🛫','🛬','🛰','🚀','🛸','🪂','💺','🚁','🪂','⛱','🎆','🎇','🧨','✨','🎑','🎃','🎄','🎋','🎍','🎎','🎐','🎏','🎁','🎗','🎟','🎫','🎠','🎡','🎢','🎪','🤹'] },
  { label: '💡', name: 'Objects', vi: 'đồ vật công cụ điện thoại', emojis: ['💡','🔦','🕯','🪔','🧯','🛢','💰','💵','💴','💶','💷','💸','💳','🪙','💹','💱','💲','✉','📧','📨','📩','📪','📫','📬','📭','📮','🗳','✏','✒','🖋','🖊','📝','📁','📂','🗂','📅','📆','🗒','🗓','📇','📈','📉','📊','📋','📌','📍','🗺','📎','🖇','✂','🗃','🗄','🗑','🔒','🔓','🔏','🔐','🔑','🗝','🔨','🪓','⛏','⚒','🛠','🗡','⚔','🔫','🪃','🛡','🪚','🔧','🪛','🔩','⚙','🗜','⚖','🦯','🔗','⛓','🪝','🧰','🧲','🪜','🧪','🧫','🧬','🔭','🔬','🩺','🩻','🩹','💊','💉','🩸','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🪒','🧴','💈','🚿','🛁','🪠','🚽','🧻','🚪','🪑','🛋','🪞','🪟','🛏','🛒','🎁','🎀','🪅','🎊','🎉','🎈','🎏','🎐','🧨','✨','🎇','🎆','🪄','🎃','🎑','🎋','🎍','🎎','🎗','🎟','🎫','🎖','🏆','🥇','🥈','🥉','🏅','🎠','🎡','🎢','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🎹','🪘','🥁','🎷','🎺','🎸','🪕','🎻','📱','💻','🖥','🖨','⌨','🖱','🖲','🕹','🗜','💾','💿','📀','🧮','📷','📸','📹','🎥','📽','🎞','📞','☎','📟','📠','📺','📻','🧭','⏱','⏲','⏰','🕰','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯','🪔','🧯','🛢','💰'] },
  { label: '#️⃣', name: 'Symbols', vi: 'ký hiệu biểu tượng lửa', emojis: ['❤','🔥','💯','✅','❌','⚠','❓','❗','‼','⁉','🔞','📵','🚫','⛔','🆘','🆒','🆙','🆕','🆓','🆗','🆖','🅰','🅱','🆎','🆑','🅾','🆚','💢','💬','💭','💤','🔊','🔇','📣','📢','🔔','🔕','🎵','🎶','⚡','🌊','🔑','🔒','🔓','🔐','💎','🏆','🥇','⭐','🌟','💫','✨','🎉','🎊','🎈','🎁','🎀','🪄','🎃','🎄','🎋','🎍','🎎','🎐','🎏','🎗','🎟','🎫','🎖','🎠','🎡','🎢','🎪','🤹','🎭','🩰'] },
]

export default function EmojiPicker({ onEmojiClick, theme = 'dark' }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(0)

  const filtered = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    const matchedCats = CATEGORIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.vi?.toLowerCase().includes(q)
    )
    if (matchedCats.length > 0) return matchedCats.flatMap(c => c.emojis)
    return CATEGORIES.flatMap(c => c.emojis)
  }, [search])

  const displayed = filtered || CATEGORIES[activeCategory]?.emojis || []

  return (
    <div style={{
      width: 320, background: theme === 'dark' ? 'var(--card)' : '#fff',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-xl)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Search */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        <input
          className="search-input"
          placeholder="Tìm emoji..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 10, fontSize: '0.82rem' }}
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', padding: '4px 6px', gap: 2 }}>
          {CATEGORIES.map((c, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              title={c.name}
              style={{
                background: activeCategory === i ? 'var(--accent-dim)' : 'transparent',
                border: 'none', cursor: 'pointer', borderRadius: 6,
                padding: '4px 6px', fontSize: '1rem', flexShrink: 0,
                outline: 'none',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 2, padding: '6px 8px', maxHeight: 260, overflowY: 'auto',
      }}>
        {displayed.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onEmojiClick({ emoji })}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '1.3rem', padding: '4px 2px', borderRadius: 6,
              lineHeight: 1, transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
