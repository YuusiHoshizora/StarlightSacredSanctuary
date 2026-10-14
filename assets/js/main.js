const text = "愿星光照亮我们的前程";

const target =
    document.getElementById("typing");

let index = 0;

function type() {

    if(index < text.length){

        target.innerHTML += text[index];

        index++;

        setTimeout(type, 80);
    }
}

// 首屏加载屏还开着的话（见 index.html 末尾那段），等它让开再开始 ——
// 否则这段打字动画会在加载屏后面白白播完，开门时 slogan 已经打好了。
if (document.documentElement.classList.contains('sss-boot')) {
    document.addEventListener('sss:booted', type, { once: true });
} else {
    type();
}