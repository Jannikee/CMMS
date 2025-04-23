// src/pages/NotFoundPage.js
import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const goHome = () => {
    navigate('/');
  };

  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist. Buhu :("
      extra={
        <Button type="primary" onClick={goHome}>
          Back to Home
        </Button>
      }
    />
  );
};

export default NotFoundPage;