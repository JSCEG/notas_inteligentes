import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleGenAI, Type } from '@google/genai';
import { auth, db, storage, googleProvider } from './firebase';
import { Project, Note } from './types';
import { handleFirestoreError, OperationType } from './utils';

// ... I'll define the context and provider here.
