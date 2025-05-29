# 🧪 Manual Testing Guide - Family Together App

## 📋 Prerequisites & Setup

### 1. Environment Setup

**Backend Setup:**
```bash
cd backend
npm install

# Create .env file with these variables:
# SUPABASE_URL=your_supabase_url
# SUPABASE_ANON_KEY=your_supabase_anon_key  
# OPENAI_API_KEY=your_openai_api_key
# PORT=3000

npm start
```

**Frontend Setup:**
```bash
cd frontend
npm install
npx expo start
```

**Verify Services Running:**
- Backend API: http://localhost:3000
- Frontend: Expo development server
- Supabase: Database connected
- WebSocket: Real-time connections active

---

## 🎯 Testing Scenarios

### 1. Authentication Flow Testing

#### **Test 1.1: Magic Link Login**
1. **Open the app** and navigate to login screen
2. **Enter valid email address** (use your real email)
3. **Tap "Send Magic Link"**
4. **Check your email** for the magic link
5. **Click the magic link** in your email
6. **Verify redirect** back to app with successful login

**Expected Result:** ✅ User logged in successfully, redirected to family onboarding

#### **Test 1.2: Invalid Email Handling**
1. **Enter invalid email** format (e.g., "invalid-email")
2. **Tap "Send Magic Link"**
3. **Verify error message** appears

**Expected Result:** ✅ Error message displayed, no magic link sent

#### **Test 1.3: Magic Link Expiration**
1. **Request magic link** but wait 15+ minutes
2. **Try to use expired link**
3. **Verify proper error handling**

**Expected Result:** ✅ "Link expired" message, redirected to login

---

### 2. Family Management Testing

#### **Test 2.1: Create New Family**
1. **After login**, tap "Create Family"
2. **Enter family name** (e.g., "Smith Family")
3. **Tap "Create Family"**
4. **Verify family creation** and navigation to trivia lobby

**Expected Result:** ✅ Family created, user is family admin, navigated to lobby

#### **Test 2.2: Join Existing Family**
1. **Tap "Join Family"** instead of create
2. **Enter valid family invite code** (get from another family member)
3. **Tap "Join Family"**
4. **Verify successful join**

**Expected Result:** ✅ Successfully joined family, navigated to lobby

#### **Test 2.3: Family Invite Generation**
1. **As family admin**, look for invite/share functionality
2. **Generate family invite link**
3. **Copy invite code/link**
4. **Test sharing** the invite

**Expected Result:** ✅ Invite code generated and shareable

---

### 3. Trivia Game Flow Testing

#### **Test 3.1: Join Game Room**
1. **Navigate to trivia lobby**
2. **Verify family members** are listed
3. **Wait for other players** to join (or test with multiple devices)
4. **Check real-time updates** as players join

**Expected Result:** ✅ Real-time player list updates, WebSocket connection active

#### **Test 3.2: Start Game Session (Host)**
1. **As the host/admin**, tap "Start Game"
2. **Verify game initialization**
3. **Check trivia questions load**
4. **Verify timer starts**

**Expected Result:** ✅ Game starts, 5 trivia questions loaded, timer counting down

#### **Test 3.3: Answer Questions**
1. **Read first trivia question**
2. **Select an answer** before timer expires
3. **Verify answer submission**
4. **Proceed through all 5 questions**
5. **Complete the game**

**Expected Result:** ✅ All answers recorded, score calculated, game completed

#### **Test 3.4: Real-time Multiplayer**
*Test with 2+ devices/family members:*
1. **All players join** the same game room
2. **Host starts game**
3. **Each player answers** questions independently
4. **Verify real-time updates** of player status
5. **Check synchronized game progression**

**Expected Result:** ✅ All players see same questions, real-time status updates

---

### 4. Scoring & Leaderboard Testing

#### **Test 4.1: Score Calculation**
1. **Complete a trivia game**
2. **Note your answers** (correct/incorrect)
3. **Verify final score** matches expected calculation
4. **Check immediate score display**

**Expected Result:** ✅ Accurate score calculation and display

#### **Test 4.2: Leaderboard Updates**
1. **Navigate to leaderboard** after completing game
2. **Verify your score** appears correctly
3. **Check family member rankings**
4. **Verify real-time updates** as others complete games

**Expected Result:** ✅ Leaderboard updates in real-time, correct rankings

#### **Test 4.3: Streak Tracking**
1. **Play trivia games** on consecutive days
2. **Check streak counter** increases
3. **Skip a day** and verify streak resets
4. **Verify "Best Streak"** tracking

**Expected Result:** ✅ Current streak tracks daily participation, best streak saved

---

### 5. Memory Vault Testing

#### **Test 5.1: Upload Photo Memory**
1. **Navigate to Memory Vault**
2. **Tap "Add Memory"**
3. **Select "Photo Memory"**
4. **Choose photo** from device gallery
5. **Add description** and save

**Expected Result:** ✅ Photo uploaded, encrypted, and stored securely

#### **Test 5.2: Create Text Memory**
1. **Tap "Add Memory"**
2. **Select "Text Memory"**
3. **Write memory description**
4. **Save memory**

**Expected Result:** ✅ Text memory encrypted and saved

#### **Test 5.3: View Family Memories**
1. **Browse existing memories**
2. **Verify decryption** works properly
3. **Check memory details** and timestamps

**Expected Result:** ✅ All memories display correctly, proper decryption

---

### 6. Error Handling & Edge Cases

#### **Test 6.1: Network Interruption**
1. **Start a trivia game**
2. **Disable internet connection** mid-game
3. **Re-enable connection**
4. **Verify app recovery**

**Expected Result:** ✅ App handles disconnection gracefully, reconnects automatically

#### **Test 6.2: WebSocket Disconnection**
1. **Join game room**
2. **Simulate WebSocket failure**
3. **Verify reconnection attempts**

**Expected Result:** ✅ WebSocket reconnects, game state preserved

#### **Test 6.3: Invalid Game States**
1. **Try joining non-existent game**
2. **Test starting game with insufficient players**
3. **Verify error messages**

**Expected Result:** ✅ Proper error handling and user feedback

---

## 🔍 Performance Testing

### **Test P.1: Load Testing**
1. **Multiple family members** join simultaneously
2. **Start multiple games** concurrently
3. **Monitor app responsiveness**

### **Test P.2: Memory Usage**
1. **Play multiple game sessions**
2. **Monitor app memory usage**
3. **Check for memory leaks**

### **Test P.3: Battery Performance**
1. **Extended gaming sessions**
2. **Monitor battery drain**
3. **Test background performance**

---

## 📱 Device-Specific Testing

### **iOS Testing Checklist:**
- [ ] Magic link opening in Safari redirects properly
- [ ] Push notifications work correctly
- [ ] Camera/photo access permissions
- [ ] Background app refresh functionality

### **Android Testing Checklist:**
- [ ] Deep link handling for magic links
- [ ] Camera and storage permissions
- [ ] Background processing
- [ ] Different screen sizes and orientations

---

## 🚨 Common Issues & Troubleshooting

### **Issue: Magic Link Not Working**
**Solutions:**
- Check email spam/junk folder
- Verify email address spelling
- Ensure backend server is running
- Check Supabase configuration

### **Issue: WebSocket Connection Fails**
**Solutions:**
- Verify backend server is running on correct port
- Check network connectivity
- Restart app to reset connection

### **Issue: Trivia Questions Not Loading**
**Solutions:**
- Verify OpenAI API key is configured
- Check internet connection
- Ensure sufficient API credits

### **Issue: Family Invite Not Working**
**Solutions:**
- Verify family code is correct
- Check if family exists
- Ensure user isn't already in a family

---

## ✅ Testing Completion Checklist

### **Core Functionality**
- [ ] Magic link authentication works
- [ ] Family creation/joining successful
- [ ] Trivia games start and complete properly
- [ ] Real-time multiplayer functionality
- [ ] Scoring and leaderboard updates
- [ ] Streak tracking accurate

### **Advanced Features**
- [ ] Memory Vault encryption/decryption
- [ ] AI trivia question generation
- [ ] WebSocket real-time updates
- [ ] Error handling and recovery

### **User Experience**
- [ ] Smooth navigation between screens
- [ ] Intuitive UI/UX interactions
- [ ] Proper loading states and feedback
- [ ] Responsive design on different devices

### **Security & Performance**
- [ ] Authentication security verified
- [ ] Data encryption working
- [ ] Performance acceptable under load
- [ ] No memory leaks or crashes

---

## 📊 Test Results Documentation

**Create a test log for each session:**

```
Date: ___________
Tester: ___________
Device: ___________
Version: ___________

Completed Tests:
✅ Authentication Flow
✅ Family Management  
✅ Trivia Game Flow
✅ Leaderboard Updates
✅ Memory Vault
✅ Error Handling

Issues Found:
- Issue 1: Description and severity
- Issue 2: Description and severity

Overall Score: ___/10
```

---

## 🎯 Next Steps After Testing

1. **Document any bugs** found during testing
2. **Prioritize issues** by severity and user impact
3. **Test fixes** after implementation
4. **Conduct user acceptance testing** with real family members
5. **Prepare for production deployment**

Remember to test with **real family members** for the most authentic user experience! 🏠✨ 