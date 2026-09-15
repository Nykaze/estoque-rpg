<script lang="ts">
  let { name, size = 18, class: cls }: { name: string; size?: number; class?: string } = $props()

  const paths: Record<string, string> = {
    dash: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    rpg: '<path d="M12 2v20M12 2C5 4 12 8 12 8s7-4 5-6M12 22C5 20 12 16 12 16s7 4 5 6"/>',
    sheets: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',
    box: '<path d="M21 8l-9-5-9 5v9l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v9"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a7 7 0 0 1 14 0v1M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    pencil: '<path d="M17 3l4 4L8 20l-5 1 1-5z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    history: '<path d="M3 12a9 9 0 1 1 3 6.7M3 12l3 3 3-3"/><path d="M12 7v5l3 2"/>',
    gift: '<rect x="3" y="8" width="18" height="9" rx="1"/><path d="M12 8v9M12 8H7a3 3 0 0 1 0-6c2 0 3.5 2 5 6zM12 8h5a3 3 0 0 0 0-6c-2 0-3.5 2-5 6z"/>',
    bag: '<path d="M6 7h12l1 13H5z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
    sparkles: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
    rune: '<path d="M12 3v18M4 7l16 10M20 7L4 17"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    sword: '<path d="M14 4l6 6M14 4L5 13l-1 7 7-1 9-9M14 4l5 5"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a2 2 0 0 1 0-4h3a5 5 0 0 0 4.9-6A9 9 0 0 0 12 3z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16.5" cy="10.5" r="1"/>',
    monster: '<path d="M12 2a8 8 0 0 0-8 8c0 2.6 1.1 4 1.6 4.7A2 2 0 0 0 7.2 15.9l1-.9a2 2 0 0 1 2 .8l.7 1.1a2 2 0 0 0 2.2 0l.7-1.1a2 2 0 0 1 2-.8l1 .9a2 2 0 0 0 1.6-1.2C18.9 14 20 12.6 20 10a8 8 0 0 0-8-8z"/><circle cx="9" cy="10.5" r="1.4"/><circle cx="15" cy="10.5" r="1.4"/><path d="M11 15.5c.3.3.7.3 1 0"/>'
  }
</script>

<svg class={cls} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {@html paths[name] || ''}
</svg>
