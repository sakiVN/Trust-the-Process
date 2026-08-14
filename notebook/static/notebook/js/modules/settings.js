 function saveSettings(event) {
    // 1. ページ再読み込みを防止
    event.preventDefault();

    // 2. 入力欄（フォーム側）の要素を取得
    const inputName = document.getElementById('input-display-name');
    const selectRole = document.getElementById('select-user-role');
    const inputAvatar = document.getElementById('input-avatar-url');

    // 3. 表示（ヘッダー側）の要素を取得
    const headerName = document.getElementById('header-user-name');
    const headerRole = document.getElementById('header-user-role');
    const headerAvatar = document.getElementById('header-user-avatar');

    // 4. 要素が存在する場合のみ安全に値を更新する
    if (inputName && headerName) {
        headerName.textContent = inputName.value;
    }
    if (selectRole && headerRole) {
        headerRole.textContent = selectRole.value;
    }
    if (inputAvatar && headerAvatar) {
        headerAvatar.src = inputAvatar.value;
    }

    // 5. 保存完了アラート
    alert('Cài đặt đã được lưu!');
}

