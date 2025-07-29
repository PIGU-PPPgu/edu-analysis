
// 检查DOM上的主题类和CSS变量值
console.log('=== 主题调试信息 ===');
console.log('document.documentElement.className:', document.documentElement.className);
console.log('computed theme classes:', document.documentElement.classList.toString());

// 检查CSS变量的实际计算值
const computedStyle = getComputedStyle(document.documentElement);
console.log('--background:', computedStyle.getPropertyValue('--background'));
console.log('--foreground:', computedStyle.getPropertyValue('--foreground'));

// 检查body的实际背景色
const bodyStyle = getComputedStyle(document.body);
console.log('body background-color:', bodyStyle.backgroundColor);
console.log('body color:', bodyStyle.color);

// 检查是否有组件使用bg-background类
const elementsWithBgBackground = document.querySelectorAll('.bg-background');
console.log('Elements with bg-background:', elementsWithBgBackground.length);
if (elementsWithBgBackground.length > 0) {
  elementsWithBgBackground.forEach((el, i) => {
    const style = getComputedStyle(el);
    console.log(`Element ${i} bg-color:`, style.backgroundColor);
  });
}

