// 비밀번호 표시/숨기기 토글
document.querySelectorAll('.toggle-visibility').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = btn.closest('.field-input').querySelector('input');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});
