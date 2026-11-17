'use strict';
function updateUILayout() {
  const available=SPECIAL_CARDS.filter(c=>state.specialCards[c.id].totalCards>0);
  state.inventoryCardRects=available.map((c,i)=>({x:W/2-380,y:200+i*(INV_CARD_H+INV_CARD_GAP),w:INV_CARD_W,h:INV_CARD_H,id:c.id}));
  const slotsX=W/2-(5*SLOT_W+4*SLOT_GAP)/2;
  state.inventorySlotRects=Array.from({length:5},(_,i)=>({x:slotsX+i*(SLOT_W+SLOT_GAP),y:H/2+80,w:SLOT_W,h:SLOT_H}));
  const cards=state.cardChoices||[];
  const startX=W/2-(cards.length*CARD_W+(cards.length-1)*CARD_GAP)/2;
  state.cardRects=cards.map((_,i)=>({x:startX+i*(CARD_W+CARD_GAP),y:H/2-CARD_H/2,w:CARD_W,h:CARD_H}));
}
