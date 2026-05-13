import React, { FC, useState } from 'react';
import { Text, useInput } from 'ink';



type props = {
  question?: string;
  onSubmit: (answer: boolean) => void;
};


const YesNo: FC<props> = ({ question = '请确认:', onSubmit }) => {
  const [selected, setSelected] = useState('yes');
  const [submitted, setSubmitted] = useState(false);

  useInput((input, key) => {
    if (key.leftArrow && selected === 'no') {
      setSelected('yes');
    }
    
    if (key.rightArrow && selected === 'yes') {
      setSelected('no');
    }
    
    if (key.return) {
      setSubmitted(true);
      onSubmit(selected === 'yes');
    }
  });

  if (submitted) {
    return (
      <Text>
        <Text color="green">✓ </Text>
        <Text>{question} </Text>
        <Text color={selected === 'yes' ? 'green' : 'red'} bold>
          {selected.toUpperCase()}
        </Text>
      </Text>
    );
  }

  return (
    <Text>
      <Text>{question} </Text>
      <Text 
        backgroundColor={selected === 'yes' ? 'green' : undefined}
        color={selected === 'yes' ? 'white' : 'gray'}
      >
        YES
      </Text>
      <Text> / </Text>
      <Text 
        backgroundColor={selected === 'no' ? 'red' : undefined}
        color={selected === 'no' ? 'white' : 'gray'}
      >
        NO
      </Text>
      <Text> (← → 选择, Enter 确认)</Text>
    </Text>
  );
};
