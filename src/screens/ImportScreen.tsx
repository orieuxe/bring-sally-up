import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { importRecords } from '../storage';
import { ACCENT } from '../utils/color';
import type { RootStackParamList, Attempt } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Import'>;
};

export default function ImportScreen({ navigation }: Props) {
  const [text, setText] = useState('');
  const currentYear = new Date().getFullYear();

  const parseRecords = (): Attempt[] => {
    const lines = text.trim().split('\n').filter(Boolean);
    const records: Attempt[] = [];

    for (const line of lines) {
      // Format: "YYYY-MM-DD M:SS" or "DD/MM/YYYY M:SS" or "DD/MM M:SS",
      // each with an optional trailing hour-of-day (0-23) for the
      // "par tranche horaire" stats, e.g. "2026-07-25 1:08 14".
      let match = line.match(
        /(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{2})[\t\s]+(\d{1,2}):(\d{2})(?:[\t\s]+(\d{1,2})h?)?/,
      );
      if (match) {
        let date = match[1];
        // If no year, assume the current year
        if (/^\d{2}\/\d{2}$/.test(date)) {
          const [d, m] = date.split('/');
          const year = new Date().getFullYear();
          date = `${year}-${m}-${d}`;
        } else if (date.includes('/')) {
          const [d, m, y] = date.split('/');
          date = `${y}-${m}-${d}`;
        }
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const duration = minutes * 60 + seconds;
        const hour = match[4] !== undefined ? parseInt(match[4], 10) : undefined;
        records.push({
          date,
          cuesCompleted: 0, // will be computed by storage if needed
          totalCues: 61,
          completed: duration >= 200,
          duration,
          ...(hour !== undefined ? { hour } : {}),
        });
        continue;
      }
    }

    return records;
  };

  const handleImport = async () => {
    const records = parseRecords();
    if (records.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('Aucun record trouvé. Formats : date 1:08');
      } else {
        Alert.alert('Aucun record trouvé', 'Formats : date 1:08');
      }
      return;
    }

    await importRecords(records);
    if (Platform.OS === 'web') {
      window.alert(`${records.length} records importés.`);
    } else {
      Alert.alert('Import réussi', `${records.length} records importés.`);
    }
    navigation.goBack();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← retour</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>Importer des records</Text>
      <Text style={styles.help}>
        {[
          'Colle tes records texte ici.',
          'Formats acceptés :',
          `• ${currentYear}-07-25 1:08`,
          `• 25/07/${currentYear} 1:08`,
          `• 25/07 1:08 (${currentYear} par défaut)`,
          '• 25/07 1:08 14 (+ heure optionnelle)',
          'Une ligne par date',
          '',
          'Une date déjà existante est remplacée par la nouvelle valeur importée.',
        ].join('\n')}
      </Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder={`${currentYear}-07-20 1:05\n${currentYear}-07-21 1:08\n${currentYear}-07-22 1:12`}
        placeholderTextColor="#555"
        value={text}
        onChangeText={setText}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.button, !text.trim() && styles.buttonDisabled]}
        onPress={handleImport}
        disabled={!text.trim()}
      >
        <Text style={styles.buttonText}>IMPORTER</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16161a',
  },
  content: { padding: 20 },
  header: { marginBottom: 12 },
  backLink: { color: '#aaa' },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  help: {
    fontSize: 13,
    color: '#888',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#ccc',
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    minHeight: 200,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  button: {
    backgroundColor: ACCENT,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0d0d0d',
  },
  buttonDisabled: { opacity: 0.4 },
});
