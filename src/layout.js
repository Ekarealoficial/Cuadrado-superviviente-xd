'use strict';
function updateUILayout() {
  const available=SPECIAL_CARDS.filter(c=>state.specialCards[c.id]?.totalCards>0);
  const cols=3,w=Math.min(218,(W-40)/cols),top=142;
  const rows=Math.max(1,Math.ceil(available.length/cols));
  const h=Math.max(26,Math.min(56,(H-top-184)/rows-5));
  state.inventoryCardRects=available.map((c,i)=>({x:(W-cols*w)/2+i%cols*w,y:top+Math.floor(i/cols)*(h+5),w:w-5,h,id:c.id}));
  const slotsX=W/2-(5*SLOT_W+4*SLOT_GAP)/2;
  state.inventorySlotRects=Array.from({length:5},(_,i)=>({x:slotsX+i*(SLOT_W+SLOT_GAP),y:Math.max(top+Math.ceil(available.length/cols)*(h+5)+38,H-SLOT_H-55),w:SLOT_W,h:SLOT_H}));
  const cards=state.cardChoices||[];
  const startX=W/2-(cards.length*CARD_W+(cards.length-1)*CARD_GAP)/2;
  state.cardRects=cards.map((_,i)=>({x:startX+i*(CARD_W+CARD_GAP),y:H/2-CARD_H/2,w:CARD_W,h:CARD_H}));
}
