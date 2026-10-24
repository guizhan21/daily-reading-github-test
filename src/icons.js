// One optical grid for interface controls. No icon fonts, emoji or remote assets.
const shapes={
 down:'<path d="m6 9 6 6 6-6"/>',
 back:'<path d="m14.5 5-7 7 7 7"/>',
 queue:'<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4" cy="6" r=".9" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r=".9" fill="currentColor" stroke="none"/>',
 play:'<path d="M8 5.3a.8.8 0 0 1 1.2-.7l10 6.7a.8.8 0 0 1 0 1.4l-10 6.7a.8.8 0 0 1-1.2-.7Z" fill="currentColor" stroke="none"/>',
 pause:'<rect x="6.5" y="4.5" width="4" height="15" rx="1.1" fill="currentColor" stroke="none"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.1" fill="currentColor" stroke="none"/>',
 previous:'<path d="M6 5v14"/><path d="m18 5-9.5 7L18 19Z" fill="currentColor" stroke="none"/>',
 next:'<path d="M18 5v14"/><path d="m6 5 9.5 7L6 19Z" fill="currentColor" stroke="none"/>',
 rewind:'<path d="M4.4 8.2A8.6 8.6 0 1 1 3.5 15.5M4.4 3.8v4.4h4.4"/><text x="12" y="15.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif" font-size="8" font-weight="600">15</text>',
 forward:'<path d="M19.6 8.2A8.6 8.6 0 1 0 20.5 15.5M19.6 3.8v4.4h-4.4"/><text x="12" y="15.5" text-anchor="middle" fill="currentColor" stroke="none" font-family="system-ui,sans-serif" font-size="8" font-weight="600">15</text>',
 heart:'<path d="M20.1 5.2a5.1 5.1 0 0 0-7.2 0l-.9.9-.9-.9a5.1 5.1 0 0 0-7.2 7.2L12 20l8.1-7.6a5.1 5.1 0 0 0 0-7.2Z"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
 more:'<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
 book:'<path d="M12 5.5C9 3.8 6 3.8 3 5v15c3-1.2 6-1.2 9 .5 3-1.7 6-1.7 9-.5V5c-3-1.2-6-1.2-9 .5Zm0 0v15"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.8"/><path d="m15.5 15.5 4.8 4.8"/>',
 settings:'<path d="m9.5 3-.6 2.2-1.5.9-2.2-.6-2.5 4.3 1.6 1.6v1.7l-1.6 1.6 2.5 4.3 2.2-.6 1.5.9.6 2.2h5l.6-2.2 1.5-.9 2.2.6 2.5-4.3-1.6-1.6v-1.7l1.6-1.6-2.5-4.3-2.2.6-1.5-.9-.6-2.2Z"/><circle cx="12" cy="12" r="3.1"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 moon:'<path d="M20.6 13.2A8.7 8.7 0 0 1 10.8 3.4a8.7 8.7 0 1 0 9.8 9.8Z"/>',
 external:'<path d="M7 17 17 7M7 7h10v10"/>',
 home:'<path d="m3 10 9-7 9 7M5.5 8.5V21h13V8.5M10 21v-7h4v7"/>',
 check:'<path d="m5 12 4.5 4.5L19 7"/>',
 circle:'<circle cx="12" cy="12" r="8.5"/>',
 progress:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12h8.5"/>',
 help:'<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-1.2.8-1.8 1.2-1.8 2.8m0 3h.01"/>'
};
export function icon(name){
 if(!Object.hasOwn(shapes,name))throw Error('Unknown interface icon: '+name);
 return '<svg class="ui-icon" data-icon="'+name+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+shapes[name]+'</svg>';
}
