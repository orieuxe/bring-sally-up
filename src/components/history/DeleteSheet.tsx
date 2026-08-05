import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import { COLORS } from '../../theme';

type Props = {
  visible: boolean;
  /** Label of the currently viewed session, e.g. "4 août 2026 · 4:12". */
  dayLabel: string | null;
  onDeleteDay: () => void;
  onDeleteAll: () => void;
  onCancel: () => void;
};

// Asks which of the two deletions is meant: the session on screen, or
// everything. Same dialog on web and native — Alert can't do it on web.
export default function DeleteSheet({
  visible,
  dayLabel,
  onDeleteDay,
  onDeleteAll,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Swallows taps so pressing the card doesn't dismiss it. */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={[styles.title, { fontSize: ms(15) }]}>Supprimer</Text>

          <TouchableOpacity
            style={[styles.choice, !dayLabel && styles.choiceDisabled]}
            disabled={!dayLabel}
            onPress={onDeleteDay}
          >
            <Text style={[styles.choiceText, { fontSize: ms(14) }]}>
              la séance affichée
            </Text>
            <Text style={[styles.choiceSub, { fontSize: ms(12) }]}>
              {dayLabel ?? 'aucune séance sélectionnée'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.choice} onPress={onDeleteAll}>
            <Text style={[styles.choiceText, styles.danger, { fontSize: ms(14) }]}>
              tout l&apos;historique
            </Text>
            <Text style={[styles.choiceSub, { fontSize: ms(12) }]}>
              tous les scores seront perdus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onCancel}>
            <Text style={[styles.cancelText, { fontSize: ms(13) }]}>annuler</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: scale(340),
    backgroundColor: COLORS.cardRaised,
    borderRadius: 16,
    paddingVertical: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    elevation: 8,
  },
  title: {
    color: COLORS.grey,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    paddingVertical: 12,
  },
  choice: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  choiceDisabled: { opacity: 0.4 },
  choiceText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  choiceSub: {
    color: COLORS.greyDim,
    marginTop: 2,
  },
  danger: { color: COLORS.bad },
  cancel: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cancelText: {
    color: COLORS.grey,
    fontWeight: '600',
  },
});
