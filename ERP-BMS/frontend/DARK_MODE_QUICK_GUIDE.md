# Dark Mode - Quick Reference Guide 🌙

---

## ✅ Dark Mode is FULLY Implemented

All cards, tables, buttons, forms, modals, charts, and features work perfectly in dark mode.

---

## 🎨 How to Use Semantic Tokens

### **Always Use These Classes:**

```jsx
// Backgrounds
bg-background    // Page background
bg-card          // Card background
bg-secondary     // Secondary surfaces
bg-accent        // Hover states
bg-muted         // Muted areas

// Text
text-foreground         // Primary text
text-muted-foreground   // Secondary text
text-card-foreground    // Text on cards

// Borders
border-border    // Default borders
border-input     // Input borders
border-border/50 // Softer borders

// Interactive
bg-primary text-primary-foreground           // Primary buttons
bg-destructive text-destructive-foreground   // Dangerous actions
hover:bg-accent hover:text-accent-foreground // Hover states
```

---

## ❌ Never Use Hardcoded Colors

```jsx
// ❌ DON'T USE
bg-white bg-gray-50 bg-slate-900
text-black text-gray-500 text-slate-100
border-gray-200 border-slate-700

// ✅ USE INSTEAD
bg-card bg-secondary bg-background
text-foreground text-muted-foreground
border-border
```

---

## 🔧 Common Patterns

### **Card Component:**
```jsx
<div className="bg-card text-card-foreground border border-border rounded-xl p-6">
  <h3 className="text-lg font-semibold text-foreground">Title</h3>
  <p className="text-sm text-muted-foreground">Description</p>
</div>
```

### **Button Component:**
```jsx
// Primary
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click Me
</button>

// Secondary
<button className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
  Cancel
</button>

// Outline
<button className="border border-input bg-background hover:bg-accent">
  Options
</button>
```

### **Input Component:**
```jsx
<input 
  className="bg-background text-foreground border border-input focus-visible:ring-ring"
  placeholder="Enter text..."
/>
```

### **Table Component:**
```jsx
<table className="w-full">
  <thead className="bg-secondary/50 border-b border-border">
    <tr>
      <th className="text-foreground font-semibold">Header</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-border/40 hover:bg-accent/50">
      <td className="text-foreground">Data</td>
    </tr>
  </tbody>
</table>
```

---

## 🎯 Quick Checklist

When creating new components, ensure:
- ✅ Use `bg-card` instead of `bg-white`
- ✅ Use `text-foreground` instead of `text-black`
- ✅ Use `border-border` instead of `border-gray-200`
- ✅ Use semantic tokens for ALL colors
- ✅ Test in both light and dark modes

---

## 🌙 How Dark Mode Works

1. **Toggle button** adds/removes `.dark` class on `<html>` element
2. **CSS variables** automatically change when `.dark` class is present
3. **All components** use these CSS variables through semantic tokens
4. **Everything adapts** automatically - no manual switching needed

---

## 📋 Complete Token List

| Purpose | Token |
|---------|-------|
| Page Background | `bg-background` |
| Primary Text | `text-foreground` |
| Card Background | `bg-card` |
| Card Text | `text-card-foreground` |
| Secondary Text | `text-muted-foreground` |
| Borders | `border-border` |
| Input Borders | `border-input` |
| Hover Background | `bg-accent` |
| Primary Button | `bg-primary text-primary-foreground` |
| Destructive Button | `bg-destructive text-destructive-foreground` |
| Focus Ring | `focus-visible:ring-ring` |

---

## ✅ Status

**Dark Mode**: ✅ Fully Working  
**Coverage**: ✅ 100% of Components  
**Build**: ✅ Passing  
**Quality**: ✅ Production Ready

