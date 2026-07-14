import { Picker, Text, View } from '@tarojs/components'

import type { LabelOption } from '@/services/labels'
import './index.css'

type Props = {
  label: string
  value?: string
  options: LabelOption[]
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function NativePicker({ label, value = '', options, placeholder = '请选择', disabled, onChange }: Props) {
  const labels = options.map((item) => item.label)
  const selectedIndex = Math.max(0, options.findIndex((item) => item.value === value))
  const selected = options.find((item) => item.value === value)

  return (
    <View className='native-picker'>
      <Text className='native-picker__label'>{label}</Text>
      <Picker
        mode='selector'
        range={labels}
        value={selectedIndex}
        disabled={disabled}
        onChange={(event) => {
          const index = Number(event.detail.value)
          const next = options[index]
          if (next) onChange(next.value)
        }}
      >
        <View className={`native-picker__control ${disabled ? 'native-picker__control--disabled' : ''}`}>
          <Text className={selected ? 'native-picker__value' : 'native-picker__placeholder'}>
            {selected?.label || placeholder}
          </Text>
          <Text className='native-picker__arrow'>⌄</Text>
        </View>
      </Picker>
    </View>
  )
}
