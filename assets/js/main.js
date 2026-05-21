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

type();