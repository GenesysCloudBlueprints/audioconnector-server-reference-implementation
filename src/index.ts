import dotenv from 'dotenv';
import { Server } from './websocket/server';

console.log('Starting service.');

dotenv.config();
new Server().start();