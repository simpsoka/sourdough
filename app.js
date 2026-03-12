// Sourdough Assistant App

// ============ Configuration ============
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Load API key from localStorage
let geminiApiKey = localStorage.getItem('sourdough-api-key') || '';

const SYSTEM_PROMPT = `You are a friendly and knowledgeable sourdough baking assistant. You help home bakers with:
- Starter maintenance (feeding schedules, troubleshooting, reviving)
- Bread recipes and techniques
- Troubleshooting common issues (dense crumb, no rise, too sour, etc.)
- Timing and scheduling bakes
- Ingredient substitutions
- Equipment recommendations

Keep responses concise but helpful. Use bullet points for lists. Be encouraging and practical.
If someone asks about their starter, ask clarifying questions about its age, feeding schedule, and behavior.
When giving recipes, include baker's percentages when relevant.`;

// ============ State ============
let recipes = JSON.parse(localStorage.getItem('sourdough-recipes') || '[]');
let chatHistory = [];

// ============ DOM Elements ============
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const messagesContainer = document.getElementById('messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const recipesList = document.getElementById('recipes-list');
const addRecipeBtn = document.getElementById('add-recipe-btn');
const recipeModal = document.getElementById('recipe-modal');
const recipeForm = document.getElementById('recipe-form');
const cancelRecipeBtn = document.getElementById('cancel-recipe');
const modalTitle = document.getElementById('modal-title');

// Settings elements
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyStatus = document.getElementById('api-key-status');
const saveApiKeyBtn = document.getElementById('save-api-key');
const clearApiKeyBtn = document.getElementById('clear-api-key');
const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
const exportRecipesBtn = document.getElementById('export-recipes');

// ============ Tab Navigation ============
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(targetTab).classList.add('active');
  });
});

// ============ Chat Functionality ============
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const message = userInput.value.trim();
  if (!message) return;
  
  // Add user message
  addMessage(message, 'user');
  userInput.value = '';
  
  // Add loading message
  const loadingMsg = addMessage('Thinking', 'assistant loading');
  
  try {
    const response = await getAIResponse(message);
    loadingMsg.remove();
    addMessage(response, 'assistant');
  } catch (error) {
    loadingMsg.remove();
    addMessage('Sorry, I had trouble responding. ' + (geminiApiKey ? 'Please try again.' : 'Add your Gemini API key in Settings to enable AI responses.'), 'assistant');
    console.error('Chat error:', error);
  }
});

function addMessage(content, type) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = `<p>${formatMessage(content)}</p>`;
  
  messageDiv.appendChild(contentDiv);
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  
  return messageDiv;
}

function formatMessage(text) {
  // Convert markdown-style formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n- /g, '</p><ul><li>')
    .replace(/\n\d+\. /g, '</p><ol><li>')
    .replace(/\n/g, '<br>');
}

async function getAIResponse(userMessage) {
  // Add to chat history
  chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
  
  if (!geminiApiKey) {
    // Fallback responses when no API key
    return getFallbackResponse(userMessage);
  }
  
  const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'I understand. I\'m ready to help with sourdough baking!' }] },
        ...chatHistory
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  const aiResponse = data.candidates[0].content.parts[0].text;
  
  chatHistory.push({ role: 'model', parts: [{ text: aiResponse }] });
  
  return aiResponse;
}

function getFallbackResponse(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('starter') && (lower.includes('feed') || lower.includes('schedule'))) {
    return "For a healthy starter, feed it 1:1:1 (starter:flour:water) by weight. If kept at room temp, feed every 12-24 hours. In the fridge, once a week is fine. Your starter is ready to use when it doubles in size and has lots of bubbles!";
  }
  
  if (lower.includes('not rising') || lower.includes('won\'t rise')) {
    return "If your dough isn't rising, check these things:\n- Is your starter active? It should double within 4-8 hours of feeding\n- Room temperature matters - aim for 75-80°F\n- Give it more time - sourdough is slow!\n- Make sure you're using enough starter (usually 15-20% of flour weight)";
  }
  
  if (lower.includes('too sour') || lower.includes('very sour')) {
    return "To reduce sourness:\n- Use your starter earlier (when it's just peaked, not fallen)\n- Shorter bulk fermentation\n- Warmer fermentation temps favor yeast over bacteria\n- Use less whole grain flour\n- Try a shorter cold retard or skip it entirely";
  }
  
  if (lower.includes('recipe') || lower.includes('basic') || lower.includes('simple')) {
    return "**Basic Sourdough Loaf**\n\n- 500g bread flour (100%)\n- 350g water (70%)\n- 100g active starter (20%)\n- 10g salt (2%)\n\n1. Mix flour + water, rest 30 min (autolyse)\n2. Add starter + salt, mix well\n3. Stretch & fold every 30 min for 2 hours\n4. Bulk ferment until 50% larger (4-6 hrs)\n5. Shape, cold proof overnight\n6. Bake at 450°F in Dutch oven: 20 min covered, 20-25 min uncovered";
  }
  
  if (lower.includes('hydration')) {
    return "Hydration = (water weight / flour weight) × 100\n\n- 65-70%: Good for beginners, easier to handle\n- 70-75%: Nice open crumb, moderate difficulty\n- 75-80%: Very open crumb, sticky dough\n- 80%+: Advanced, very wet and tricky\n\nStart lower and work your way up as you get comfortable!";
  }
  
  return "I'd love to help with that! To give you the best advice, could you tell me more about:\n- What specific issue you're facing?\n- How old is your starter?\n- What's your typical process?\n\n(Tip: Add your Gemini API key in Settings for full AI-powered responses!)";
}

// ============ Settings Functionality ============
function initSettings() {
  // Load existing API key into input (masked)
  if (geminiApiKey) {
    apiKeyInput.value = geminiApiKey;
    showApiKeyStatus('API key is configured', 'success');
  }
}

function showApiKeyStatus(message, type) {
  apiKeyStatus.textContent = message;
  apiKeyStatus.className = `api-key-status ${type}`;
}

saveApiKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  
  if (!key) {
    showApiKeyStatus('Please enter an API key', 'error');
    return;
  }
  
  // Test the API key
  showApiKeyStatus('Testing API key...', 'info');
  
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });
    
    if (response.ok) {
      geminiApiKey = key;
      localStorage.setItem('sourdough-api-key', key);
      showApiKeyStatus('API key saved and verified!', 'success');
    } else {
      const error = await response.json();
      showApiKeyStatus(`Invalid API key: ${error.error?.message || 'Unknown error'}`, 'error');
    }
  } catch (error) {
    showApiKeyStatus('Could not verify API key. Saving anyway...', 'info');
    geminiApiKey = key;
    localStorage.setItem('sourdough-api-key', key);
    setTimeout(() => showApiKeyStatus('API key saved', 'success'), 1500);
  }
});

clearApiKeyBtn.addEventListener('click', () => {
  geminiApiKey = '';
  localStorage.removeItem('sourdough-api-key');
  apiKeyInput.value = '';
  showApiKeyStatus('API key cleared', 'info');
  setTimeout(() => {
    apiKeyStatus.className = 'api-key-status';
  }, 2000);
});

toggleKeyVisibilityBtn.addEventListener('click', () => {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleKeyVisibilityBtn.textContent = '🙈';
  } else {
    apiKeyInput.type = 'password';
    toggleKeyVisibilityBtn.textContent = '👁️';
  }
});

exportRecipesBtn.addEventListener('click', () => {
  const dataStr = JSON.stringify(recipes, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sourdough-recipes.json';
  a.click();
  URL.revokeObjectURL(url);
});

// ============ Recipe Functionality ============
function renderRecipes() {
  if (recipes.length === 0) {
    recipesList.innerHTML = `
      <div class="empty-state">
        <p>No recipes yet. Start documenting your bakes!</p>
        <button class="btn-primary" onclick="openRecipeModal()">Add Your First Recipe</button>
      </div>
    `;
    return;
  }
  
  recipesList.innerHTML = recipes
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .map(recipe => `
      <div class="recipe-card" onclick="viewRecipe('${recipe.id}')">
        <div class="recipe-card-header">
          <h3>${escapeHtml(recipe.name)}</h3>
          <span class="rating">${'⭐'.repeat(recipe.rating || 0)}</span>
        </div>
        ${recipe.date ? `<div class="date">${formatDate(recipe.date)}</div>` : ''}
        ${recipe.notes ? `<div class="notes">"${escapeHtml(recipe.notes.substring(0, 100))}${recipe.notes.length > 100 ? '...' : ''}"</div>` : ''}
        <div class="recipe-card-actions">
          <button class="btn-secondary" onclick="event.stopPropagation(); editRecipe('${recipe.id}')">Edit</button>
          <button class="btn-secondary" onclick="event.stopPropagation(); deleteRecipe('${recipe.id}')">Delete</button>
        </div>
      </div>
    `).join('');
}

function openRecipeModal(recipe = null) {
  modalTitle.textContent = recipe ? 'Edit Recipe' : 'Add New Recipe';
  
  document.getElementById('recipe-id').value = recipe?.id || '';
  document.getElementById('recipe-name').value = recipe?.name || '';
  document.getElementById('recipe-ingredients').value = recipe?.ingredients || '';
  document.getElementById('recipe-instructions').value = recipe?.instructions || '';
  document.getElementById('recipe-notes').value = recipe?.notes || '';
  document.getElementById('recipe-rating').value = recipe?.rating || '';
  document.getElementById('recipe-date').value = recipe?.date || new Date().toISOString().split('T')[0];
  
  recipeModal.classList.remove('hidden');
}

function closeRecipeModal() {
  recipeModal.classList.add('hidden');
  recipeForm.reset();
}

recipeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = document.getElementById('recipe-id').value || Date.now().toString();
  const recipe = {
    id,
    name: document.getElementById('recipe-name').value,
    ingredients: document.getElementById('recipe-ingredients').value,
    instructions: document.getElementById('recipe-instructions').value,
    notes: document.getElementById('recipe-notes').value,
    rating: parseInt(document.getElementById('recipe-rating').value) || 0,
    date: document.getElementById('recipe-date').value
  };
  
  const existingIndex = recipes.findIndex(r => r.id === id);
  if (existingIndex >= 0) {
    recipes[existingIndex] = recipe;
  } else {
    recipes.push(recipe);
  }
  
  saveRecipes();
  renderRecipes();
  closeRecipeModal();
});

addRecipeBtn.addEventListener('click', () => openRecipeModal());
cancelRecipeBtn.addEventListener('click', closeRecipeModal);

// Close modal on outside click
recipeModal.addEventListener('click', (e) => {
  if (e.target === recipeModal) closeRecipeModal();
});

function editRecipe(id) {
  const recipe = recipes.find(r => r.id === id);
  if (recipe) openRecipeModal(recipe);
}

function viewRecipe(id) {
  const recipe = recipes.find(r => r.id === id);
  if (recipe) openRecipeModal(recipe);
}

function deleteRecipe(id) {
  if (confirm('Delete this recipe?')) {
    recipes = recipes.filter(r => r.id !== id);
    saveRecipes();
    renderRecipes();
  }
}

function saveRecipes() {
  localStorage.setItem('sourdough-recipes', JSON.stringify(recipes));
}

// ============ Utilities ============
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Make functions available globally for onclick handlers
window.openRecipeModal = openRecipeModal;
window.editRecipe = editRecipe;
window.viewRecipe = viewRecipe;
window.deleteRecipe = deleteRecipe;

// ============ Initialize ============
renderRecipes();
initSettings();
