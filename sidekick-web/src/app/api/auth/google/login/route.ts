const redirect = async () => {
    await fetch('http://localhost:5000/auth/google/login')
};

redirect();