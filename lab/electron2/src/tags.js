const Tagify = require("@yaireo/tagify");

function _createTagsInput(tagsObj, onChangeFn) {

    let div = document.createElement("div");
    div.className = "tags";

    let input = document.createElement("input");
    input.setAttribute("placeholder", 'ffff');
    input.className = "customLook";
    // input.value = tags;
    let button = document.createElement("button");
    button.innerText = "+";
    div.appendChild(input);
    div.appendChild(button);

    let tagify = new Tagify(input, {
        callbacks: {
            "invalid": onInvalidTag,
            "change": onChange
        },
        dropdown: {
            position: 'text',
            enabled: 1
        }
    });

    if (tagsObj) {
        //有标签，只显示
        tagify.addTags(Array.from(tagsObj, t => {
            return {
                value: t.value,
                color: t.type == 0 ? "blue" : "gray"
            }
        }))
    };

    button.addEventListener("click", onAddButtonClick)

    function onAddButtonClick() {
        tagify.addEmptyTag()
    }

    function onInvalidTag(e) {
        console.log("invalid", e.detail)
    }



    function onChange(e) {
        console.log("onChange", e.detail)
        if (onChangeFn) onChangeFn(e.detail);
    };

    //input.addEventListener('change', onChange);
    return {
        div,
        tagify
    }

}


module.exports = _createTagsInput;