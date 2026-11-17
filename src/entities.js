'use strict';
/** @typedef {{x:number,y:number,vx:number,vy:number,size?:number,r?:number}} Body */
/** @typedef {Body & {type:string,hp:number,maxHp:number,speed:number,activeDarts:number}} Enemy */
/** @typedef {Body & {damage:number,life:number,bounces:number,homing:boolean,dupli:number}} Projectile */
/** Shared body defaults; individual factories supply their own combat fields. */
function createBody(fields) { return Object.assign({x:0,y:0,vx:0,vy:0,angle:0},fields); }
